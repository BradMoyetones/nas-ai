import { Router } from 'express';
import type { Request, Response } from 'express';

import { getModelById } from '../services/ai/providers';
import { streamFromProvider } from '../services/ai/engine';
import { conversationService } from '../services/conversation.service';
import { buildContext } from '../services/ai/context-builder';
import { generateConversationTitle } from '../services/ai/conversation-title.service';
import { normalizeGenerationError, generationErrorToMetadata, isAbortError } from '../services/ai/generation-error';
import { endChatStream, writeChatStreamEvent } from '../services/ai/chat-sse';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    const startedAt = Date.now();

    let { content, conversationId, modelId } = req.body;

    /*
     * ============================================================
     * Validaciones HTTP
     * ============================================================
     *
     * Estas ocurren antes de abrir SSE.
     * Por lo tanto, aquí sí utilizamos respuestas HTTP normales.
     */

    if (typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({
            error: 'content is required and must be a non-empty string.',
        });
    }

    const targetModelId = modelId || 'openai/gpt-oss-120b';

    const selectedModel = getModelById(targetModelId);

    if (!selectedModel) {
        return res.status(404).json({
            error: `Model not found: ${targetModelId}`,
        });
    }

    const userId = req.user!.userId;

    /*
     * ============================================================
     * Estado de la conversación
     * ============================================================
     */

    let isNewConversation = false;
    let conversationTitle = '';

    let titleGenerationPromise: Promise<void> | null = null;

    /*
     * ============================================================
     * AbortController
     * ============================================================
     */

    const abortController = new AbortController();

    try {
        /*
         * ========================================================
         * Obtener / crear conversación
         * ========================================================
         */

        if (conversationId) {
            const conversation = await conversationService.getByIdForUser(conversationId, userId);

            if (!conversation) {
                return res.status(404).json({
                    error: 'Conversation not found',
                });
            }
        } else {
            conversationTitle = 'New conversation';

            const conversation = await conversationService.create(userId, conversationTitle);

            conversationId = conversation.id;

            isNewConversation = true;
        }

        /*
         * ========================================================
         * Guardar mensaje del usuario
         * ========================================================
         */

        await conversationService.addMessage(conversationId, {
            role: 'user',
            content,
        });

        /*
         * ========================================================
         * Obtener historial
         * ========================================================
         */

        const history = await conversationService.getMessages(conversationId);

        /*
         * ========================================================
         * Construir contexto
         * ========================================================
         */

        const contextMessages = buildContext(history);

        /*
         * ========================================================
         * Abrir SSE
         * ========================================================
         *
         * MUY IMPORTANTE:
         *
         * Desde este punto la generación ya no debe responder
         * con res.status().json().
         *
         * Los errores deben viajar como eventos SSE.
         */

        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',

            'Cache-Control': 'no-cache, no-transform',

            Connection: 'keep-alive',

            'X-Accel-Buffering': 'no',
        });

        /*
         * Fuerza el envío inmediato de los headers.
         * Esto ayuda a que el cliente establezca el stream
         * antes de que llegue la generación.
         */

        res.flushHeaders();

        /*
         * ========================================================
         * Detectar desconexión del cliente
         * ========================================================
         *
         * Escuchamos la respuesta, no la request.
         */

        res.once('close', () => {
            if (!res.writableEnded) {
                abortController.abort();

                console.log(`[chat] Client disconnected for conversation ${conversationId}`);
            }
        });

        /*
         * ========================================================
         * Crear conversación
         * ========================================================
         */

        if (isNewConversation) {
            writeChatStreamEvent(res, 'conversation.created', {
                id: conversationId,
                title: conversationTitle,
            });

            /*
             * El título es independiente de la generación principal.
             *
             * Si falla, no debe romper el chat.
             */

            titleGenerationPromise = generateConversationTitle({
                content,
                model: selectedModel,
                signal: abortController.signal,
            })
                .then(async (title) => {
                    await conversationService.updateTitle(conversationId!, title);

                    writeChatStreamEvent(res, 'conversation.title', {
                        id: conversationId!,
                        title,
                    });
                })
                .catch((error) => {
                    if (isAbortError(error)) {
                        return;
                    }

                    console.error('[chat] Error generating conversation title:', error);
                });
        }

        /*
         * ========================================================
         * Estado de generación
         * ========================================================
         */

        let chunkCount = 0;

        let fullAssistantContent = '';

        let totalReasoningTokens: number | undefined;

        /*
         * ========================================================
         * GENERACIÓN
         * ========================================================
         *
         * Los errores del provider se manejan aquí.
         */

        try {
            const stream = await streamFromProvider({
                messages: contextMessages,

                model: selectedModel,

                signal: abortController.signal,
            });

            for await (const chunk of stream) {
                /*
                 * Si el cliente ya se desconectó,
                 * no seguimos procesando.
                 */

                if (abortController.signal.aborted) {
                    throw new Error('Request aborted');
                }

                chunkCount++;

                /*
                 * ------------------------------------------------
                 * Texto generado
                 * ------------------------------------------------
                 */

                if (chunk.content) {
                    fullAssistantContent += chunk.content;

                    writeChatStreamEvent(res, 'message.delta', {
                        content: chunk.content,
                    });
                }

                /*
                 * ------------------------------------------------
                 * Reasoning tokens
                 * ------------------------------------------------
                 */

                if (chunk.reasoningTokens !== undefined) {
                    totalReasoningTokens = (totalReasoningTokens ?? 0) + chunk.reasoningTokens;
                }
            }

            /*
             * ====================================================
             * Guardar respuesta exitosa
             * ====================================================
             */

            const assistantMsg = await conversationService.addMessage(conversationId, {
                role: 'assistant',

                content: fullAssistantContent,

                model: selectedModel.id,

                provider: selectedModel.provider,
            });

            /*
             * ====================================================
             * message.completed
             * ====================================================
             */

            writeChatStreamEvent(res, 'message.completed', {
                messageId: assistantMsg.id,

                model: selectedModel.id,

                provider: selectedModel.provider,

                usage:
                    totalReasoningTokens !== undefined
                        ? {
                              reasoningTokens: totalReasoningTokens,
                          }
                        : undefined,
            });

            /*
             * ====================================================
             * Título
             * ====================================================
             *
             * Solo necesitamos esperar el título cuando la
             * generación principal terminó correctamente.
             */

            if (titleGenerationPromise) {
                await titleGenerationPromise;
            }

            /*
             * ====================================================
             * generation.done
             * ====================================================
             */

            writeChatStreamEvent(res, 'generation.done', {
                status: 'success',

                elapsedMs: Date.now() - startedAt,

                chunkCount,
            });
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
             * NORMALIZAR ERROR DEL PROVIDER
             * ====================================================
             */

            const generationError = normalizeGenerationError(error, selectedModel);

            /*
             * ====================================================
             * LOG TÉCNICO
             * ====================================================
             */

            console.error('[chat] Generation failed', {
                conversationId,

                model: selectedModel.id,

                provider: selectedModel.provider,

                code: generationError.code,

                status: generationError.status,

                providerCode: generationError.providerCode,

                retryable: generationError.retryable,

                requestId: generationError.requestId,

                message: generationError.message,

                error,

                stack: error instanceof Error ? error.stack : undefined,
            });

            /*
             * ====================================================
             * Metadata persistible
             * ====================================================
             */

            const metadata = generationErrorToMetadata(generationError);

            /*
             * ====================================================
             * Guardar mensaje de error
             * ====================================================
             *
             * Si ya recibimos parte de la generación antes de que
             * el provider fallara, conservamos ese contenido.
             *
             * Si no recibimos ningún chunk, usamos el mensaje
             * amigable de error.
             */

            let errorMessageId: string | undefined;

            try {
                const errorMessage = await conversationService.addMessage(conversationId, {
                    role: 'assistant',

                    content: fullAssistantContent || generationError.userMessage,

                    model: selectedModel.id,

                    provider: selectedModel.provider,

                    metadata,
                });

                errorMessageId = errorMessage.id;
            } catch (dbError) {
                /*
                 * El manejo del error no puede fallar solo porque
                 * la persistencia del propio error haya fallado.
                 */

                console.error('[chat] Failed to persist generation error message:', dbError);
            }

            /*
             * ====================================================
             * SSE: message.error
             * ====================================================
             */

            writeChatStreamEvent(res, 'message.error', {
                messageId: errorMessageId,

                model: selectedModel.id,

                provider: selectedModel.provider,

                code: generationError.code,

                status: generationError.status,

                message: generationError.userMessage,

                retryable: generationError.retryable,
            });

            /*
             * ====================================================
             * SSE: generation.done
             * ====================================================
             */

            writeChatStreamEvent(res, 'generation.done', {
                status: 'error',

                elapsedMs: Date.now() - startedAt,

                chunkCount,
            });
        }
    } catch (error) {
        /*
         * ========================================================
         * ERROR DE INFRAESTRUCTURA
         * ========================================================
         *
         * Este catch es distinto del anterior.
         *
         * Aquí pueden aparecer errores inesperados de:
         *
         * - DB
         * - context builder
         * - conversation service
         * - lógica del router
         *
         * Si SSE ya comenzó:
         *     → SSE
         *
         * Si SSE todavía no comenzó:
         *     → HTTP
         */

        if (isAbortError(error) || abortController.signal.aborted) {
            console.log(`[chat] Request aborted for conversation ${conversationId}`);

            endChatStream(res);

            return;
        }

        console.error('[chat] Unexpected chat error', {
            conversationId,

            model: selectedModel.id,

            provider: selectedModel.provider,

            error,

            stack: error instanceof Error ? error.stack : undefined,
        });

        /*
         * ========================================================
         * SSE YA ABIERTO
         * ========================================================
         */

        if (res.headersSent) {
            writeChatStreamEvent(res, 'message.error', {
                model: selectedModel.id,

                provider: selectedModel.provider,

                code: 'CHAT_INTERNAL_ERROR',

                message: 'Ocurrió un error inesperado al procesar la conversación.',

                retryable: true,
            });

            writeChatStreamEvent(res, 'generation.done', {
                status: 'error',

                elapsedMs: Date.now() - startedAt,

                chunkCount: 0,
            });

            endChatStream(res);

            return;
        }

        /*
         * ========================================================
         * SSE TODAVÍA NO ABIERTO
         * ========================================================
         */

        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    } finally {
        /*
         * ============================================================
         * Cierre defensivo
         * ============================================================
         */

        endChatStream(res);
    }
});

export { router as chatRouter };
