import { Hono } from 'hono';
import { chatMessageSchema } from '@nas/shared';
import { streamText, createUIMessageStream, createUIMessageStreamResponse, toUIMessageStream, tool, isStepCount } from 'ai';

import { getModelById } from '../services/ai/model-discovery';
import { resolveModelWithCredentials } from '../services/ai/provider-registry';
import { credentialService } from '../services/credential.service';
import { conversationService } from '../services/conversation.service';
import { generateConversationTitle } from '../services/ai/conversation-title.service';
import { normalizeGenerationError, generationErrorToMetadata, isAbortError } from '../services/ai/generation-error';
import type { AppEnv } from '../app';
import z from 'zod';

const chatRouter = new Hono<AppEnv>();

chatRouter.post('/', async (c) => {
    const user = c.get('user');

    const body = await c.req.json();
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({
            error: 'Datos de entrada inválidos',
            details: parsed.error.issues,
        }, 400);
    }

    let { content, conversationId, modelId } = parsed.data;

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
     */

    let isNewConversation = false;
    let systemPrompt: string | null = null;

    if (conversationId) {
        const conversation = await conversationService.getByIdForUser(conversationId, userId);

        if (!conversation) {
            return c.json({
                error: 'Conversation not found',
            }, 404);
        }
        systemPrompt = conversation.systemPrompt;
    } else {
        const conversation = await conversationService.create(userId, 'New conversation');

        conversationId = conversation.id;
        isNewConversation = true;
    }

    if (!conversationId) {
        return c.json({ error: 'Fallo al inicializar la conversación' }, 500);
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

    /**
     * Máximo de mensajes a enviar al modelo.
     * Protege contra conversaciones muy largas que excedan
     * la ventana de contexto del modelo.
     */
    const MAX_CONTEXT_MESSAGES = 50;
    const recentHistory = history.slice(-MAX_CONTEXT_MESSAGES);

    const messages = recentHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
    }));

    /*
     * ============================================================
     * Resolver modelo del AI SDK (con credenciales de usuario)
     * ============================================================
     */

    const userApiKey = await credentialService.resolveApiKey(
        user.userId,
        selectedModel.provider,
    );

    const aiModel = resolveModelWithCredentials(
        selectedModel.provider,
        selectedModel.id,
        userApiKey,
    );

    /*
     * ============================================================
     * UI Message Stream con AI SDK v7
     * ============================================================
     */

    const abortController = new AbortController();

    c.req.raw.signal.addEventListener('abort', () => {
        abortController.abort();
        console.log(`[chat] Client disconnected for conversation ${conversationId}`);
    });

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            let titleGenerationPromise: Promise<void> | null = null;

            /*
             * Generación del título en background (solo nuevas conversaciones)
             */
            if (isNewConversation) {
                titleGenerationPromise = generateConversationTitle({
                    content,
                    model: selectedModel,
                    signal: abortController.signal,
                })
                    .then(async (title) => {
                        await conversationService.updateTitle(conversationId!, title);
                    })
                    .catch((error) => {
                        if (isAbortError(error)) return;
                        console.error('[chat] Error generating conversation title:', error);
                    });
            }

            /*
             * GENERACIÓN con AI SDK
             */
            try {
                const result = streamText({
                    model: aiModel,
                    system: systemPrompt || 'You are a helpful AI assistant.',
                    messages,
                    abortSignal: abortController.signal,
                    tools: {
                        getCurrentDateTime: tool({
                            description: 'Returns the current date and time of the server',
                            inputSchema: z.object({}),
                            outputSchema: z.object({
                                currentDateTime: z.string()
                            }),
                            execute: async ({}) => {
                                return {
                                    currentDateTime: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
                                };
                            },
                        }),
                    },
                    stopWhen: isStepCount(5),
                    onFinish: async ({ text, usage }) => {
                        await conversationService.addMessage(conversationId, {
                            role: 'assistant',
                            content: text,
                            model: selectedModel.id,
                            provider: selectedModel.provider,
                            promptTokens: usage?.inputTokens,
                            completionTokens: usage?.outputTokens,
                            totalTokens: usage?.totalTokens,
                            reasoningTokens: usage?.outputTokenDetails?.reasoningTokens,
                        });

                        if (titleGenerationPromise) {
                            await titleGenerationPromise;
                        }
                    },
                });

                writer.merge(toUIMessageStream({
                    stream: result.stream,
                    sendReasoning: true,
                }));
            } catch (error) {
                if (isAbortError(error) || abortController.signal.aborted) {
                    console.log(`[chat] Generation aborted for conversation ${conversationId}`);
                    return;
                }

                const generationError = normalizeGenerationError(error, selectedModel);

                console.error('[chat] Generation failed', {
                    conversationId,
                    model: selectedModel.id,
                    provider: selectedModel.provider,
                    code: generationError.code,
                    message: generationError.message,
                });

                const metadata = generationErrorToMetadata(generationError);

                try {
                    await conversationService.addMessage(conversationId, {
                        role: 'assistant',
                        content: generationError.userMessage,
                        model: selectedModel.id,
                        provider: selectedModel.provider,
                        metadata,
                    });
                } catch (dbError) {
                    console.error('[chat] Failed to persist generation error message:', dbError);
                }

                writer.write({
                    type: 'error',
                    errorText: generationError.userMessage,
                });
            }
        },
        onError: (error) => {
            console.error('[chat] Stream error:', error);
            return 'An error occurred during generation.';
        },
    });

    /*
     * ============================================================
     * Response con headers custom para metadata de conversación
     * ============================================================
     *
     * El frontend lee estos headers para actualizar la UI
     * (navegación, sidebar, etc.) sin depender de chunks custom.
     */

    const response = createUIMessageStreamResponse({ stream });

    response.headers.set('X-Conversation-Id', conversationId);
    response.headers.set('X-Is-New-Conversation', isNewConversation ? '1' : '0');

    return response;
});

export { chatRouter };
