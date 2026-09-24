import { Hono } from 'hono';
import { streamText, createUIMessageStream, createUIMessageStreamResponse, toUIMessageStream } from 'ai';

import { getModelById } from '../services/ai/providers';
import { resolveModel } from '../services/ai/provider-registry';
import { conversationService } from '../services/conversation.service';
import { generateConversationTitle } from '../services/ai/conversation-title.service';
import { normalizeGenerationError, generationErrorToMetadata, isAbortError } from '../services/ai/generation-error';
import type { AppEnv } from '../app';

const chatRouter = new Hono<AppEnv>();

chatRouter.post('/', async (c) => {
    const startedAt = Date.now();
    const user = c.get('user');

    let { content, conversationId, modelId } = await c.req.json();

    /*
     * ============================================================
     * Validaciones HTTP
     * ============================================================
     *
     * Estas ocurren antes de abrir el stream.
     * Por lo tanto, aquí sí utilizamos respuestas HTTP normales.
     */

    if (typeof content !== 'string' || content.trim() === '') {
        return c.json({
            error: 'content is required and must be a non-empty string.',
        }, 400);
    }

    const targetModelId = modelId || 'openai/gpt-oss-120b';

    const selectedModel = getModelById(targetModelId);

    if (!selectedModel) {
        return c.json({
            error: `Model not found: ${targetModelId}`,
        }, 404);
    }

    const userId = user.userId;

    /*
     * ============================================================
     * Obtener / crear conversación ANTES del stream
     * ============================================================
     *
     * REST-first: la conversación se crea antes de abrir el stream.
     * Esto es más robusto que crearla dentro del stream.
     */

    let isNewConversation = false;
    let conversationTitle = '';

    if (conversationId) {
        const conversation = await conversationService.getByIdForUser(conversationId, userId);

        if (!conversation) {
            return c.json({
                error: 'Conversation not found',
            }, 404);
        }
    } else {
        conversationTitle = 'New conversation';

        const conversation = await conversationService.create(userId, conversationTitle);

        conversationId = conversation.id;

        isNewConversation = true;
    }

    /*
     * ============================================================
     * Guardar mensaje del usuario
     * ============================================================
     */

    await conversationService.addMessage(conversationId, {
        role: 'user',
        content,
    });

    /*
     * ============================================================
     * Obtener historial y construir mensajes AI SDK
     * ============================================================
     */

    const history = await conversationService.getMessages(conversationId);

    const messages = history.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
    }));

    /*
     * ============================================================
     * Resolver modelo del AI SDK
     * ============================================================
     */

    const aiModel = resolveModel(selectedModel.provider, selectedModel.id);

    /*
     * ============================================================
     * UI Message Stream con AI SDK v7
     * ============================================================
     *
     * createUIMessageStream nos permite:
     * 1. Enviar custom chunks (conversation.created, title, etc.)
     * 2. Merge del stream de texto del LLM
     * 3. Todo sobre el Data Stream Protocol estándar
     */

    const abortController = new AbortController();

    // Detectar desconexión del cliente
    c.req.raw.signal.addEventListener('abort', () => {
        abortController.abort();
        console.log(`[chat] Client disconnected for conversation ${conversationId}`);
    });

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            let titleGenerationPromise: Promise<void> | null = null;

            /*
             * ========================================================
             * Evento: conversación creada
             * ========================================================
             */

            if (isNewConversation) {
                writer.write({
                    type: 'custom',
                    kind: 'nas.conversation-created',
                    id: conversationId,
                    title: conversationTitle,
                } as any);

                /*
                 * Generación del título en background.
                 * Si falla, no debe romper el chat.
                 */
                titleGenerationPromise = generateConversationTitle({
                    content,
                    model: selectedModel,
                    signal: abortController.signal,
                })
                    .then(async (title) => {
                        await conversationService.updateTitle(conversationId!, title);

                        writer.write({
                            type: 'custom',
                            kind: 'nas.conversation-title',
                            id: conversationId!,
                            title,
                        } as any);
                    })
                    .catch((error) => {
                        if (isAbortError(error)) return;
                        console.error('[chat] Error generating conversation title:', error);
                    });
            }

            /*
             * ========================================================
             * GENERACIÓN con AI SDK
             * ========================================================
             */

            try {
                const result = streamText({
                    model: aiModel,
                    system: 'You are a helpful AI assistant.',
                    messages,
                    abortSignal: abortController.signal,
                    onFinish: async ({ text, usage }) => {
                        /*
                         * ====================================================
                         * Guardar respuesta exitosa
                         * ====================================================
                         */
                        const assistantMsg = await conversationService.addMessage(conversationId, {
                            role: 'assistant',
                            content: text,
                            model: selectedModel.id,
                            provider: selectedModel.provider,
                        });

                        /*
                         * ====================================================
                         * Evento: message.completed
                         * ====================================================
                         */
                        writer.write({
                            type: 'custom',
                            kind: 'nas.message-completed',
                            messageId: assistantMsg.id,
                            model: selectedModel.id,
                            provider: selectedModel.provider,
                            usage: usage ?? undefined,
                        } as any);

                        /*
                         * ====================================================
                         * Esperar título si es nueva conversación
                         * ====================================================
                         */
                        if (titleGenerationPromise) {
                            await titleGenerationPromise;
                        }

                        /*
                         * ====================================================
                         * Evento: generation.done
                         * ====================================================
                         */
                        writer.write({
                            type: 'custom',
                            kind: 'nas.generation-done',
                            status: 'success',
                            elapsedMs: Date.now() - startedAt,
                        } as any);
                    },
                });

                // Merge el stream del LLM en el UI message stream
                // toUIMessageStream convierte TextStreamPart → UIMessageChunk
                writer.merge(toUIMessageStream({
                    stream: result.stream,
                    sendReasoning: true,
                }));
            } catch (error) {
                /*
                 * ====================================================
                 * ABORT
                 * ====================================================
                 */
                if (isAbortError(error) || abortController.signal.aborted) {
                    console.log(`[chat] Generation aborted for conversation ${conversationId}`);
                    return;
                }

                /*
                 * ====================================================
                 * Error del provider
                 * ====================================================
                 */
                const generationError = normalizeGenerationError(error, selectedModel);

                console.error('[chat] Generation failed', {
                    conversationId,
                    model: selectedModel.id,
                    provider: selectedModel.provider,
                    code: generationError.code,
                    message: generationError.message,
                });

                const metadata = generationErrorToMetadata(generationError);

                let errorMessageId: string | undefined;
                try {
                    const errorMessage = await conversationService.addMessage(conversationId, {
                        role: 'assistant',
                        content: generationError.userMessage,
                        model: selectedModel.id,
                        provider: selectedModel.provider,
                        metadata,
                    });
                    errorMessageId = errorMessage.id;
                } catch (dbError) {
                    console.error('[chat] Failed to persist generation error message:', dbError);
                }

                writer.write({
                    type: 'error',
                    errorText: JSON.stringify({
                        messageId: errorMessageId,
                        model: selectedModel.id,
                        provider: selectedModel.provider,
                        code: generationError.code,
                        status: generationError.status,
                        message: generationError.userMessage,
                        retryable: generationError.retryable,
                    }),
                });

                writer.write({
                    type: 'custom',
                    kind: 'nas.generation-done',
                    status: 'error',
                    elapsedMs: Date.now() - startedAt,
                } as any);
            }
        },
        onError: (error) => {
            console.error('[chat] Stream error:', error);
            return 'An error occurred during generation.';
        },
    });

    return createUIMessageStreamResponse({ stream });
});

export { chatRouter };
