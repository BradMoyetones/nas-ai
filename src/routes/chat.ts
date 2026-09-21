import { Router } from 'express';
import type { Request, Response } from 'express';
import { getModelById } from '../services/ai/providers';
import { streamFromProvider } from '../services/ai/engine';
import { conversationService } from '../services/conversation.service';
import { buildContext } from '../services/ai/context-builder';
import { generateConversationTitle } from '../services/ai/conversation-title.service';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    const startedAt = Date.now();
    let { content, conversationId, modelId } = req.body;

    if (typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ error: 'content is required and must be a non-empty string.' });
    }

    const targetModelId = modelId || 'openai/gpt-oss-120b';
    const selectedModel = getModelById(targetModelId);

    if (!selectedModel) {
        return res.status(404).json({ error: `Model not found: ${targetModelId}` });
    }

    const userId = req.user!.userId;

    try {
        let isNewConversation = false;
        let conversationTitle = '';
        let titleGenerationPromise: Promise<void> | null = null;

        if (conversationId) {
            const conversation = await conversationService.getByIdForUser(conversationId, userId);
            if (!conversation) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
        } else {
            conversationTitle = 'New conversation';
            const conversation = await conversationService.create(userId, conversationTitle);
            conversationId = conversation.id;
            isNewConversation = true;
        }

        // Save user message
        await conversationService.addMessage(conversationId, {
            role: 'user',
            content,
        });

        // Get history - source of truth
        const history = await conversationService.getMessages(conversationId);

        // Build context
        const contextMessages = buildContext(history);

        // Abort controller for cancellation
        const abortController = new AbortController();
        req.on('close', () => {
            abortController.abort();
        });

        const stream = await streamFromProvider({
            messages: contextMessages,
            model: selectedModel,
            signal: abortController.signal,
        });

        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const sseEvent = (event: string, data: any) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        if (isNewConversation) {
            res.write(sseEvent('conversation.created', { id: conversationId, title: conversationTitle }));

            titleGenerationPromise =
                generateConversationTitle({
                    content,
                    model: selectedModel,
                    signal: abortController.signal,
                })
                    .then(async (title) => {

                        await conversationService.updateTitle(
                            conversationId!,
                            title
                        );

                        if (
                            !res.writableEnded &&
                            !res.destroyed
                        ) {

                            res.write(
                                sseEvent(
                                    'conversation.title',
                                    {
                                        id: conversationId,
                                        title,
                                    }
                                )
                            );
                        }
                    })
                    .catch((error) => {

                        if (
                            error?.name === 'AbortError' ||
                            error?.message === 'AbortError'
                        ) {
                            return;
                        }

                        console.error(
                            '[chat] Error generating conversation title:',
                            error
                        );

                    });
        }

        let chunkCount = 0;
        let fullAssistantContent = '';
        let totalReasoningTokens: number | undefined = undefined;

        for await (const chunk of stream) {
            chunkCount++;
            if (chunk.content) {
                fullAssistantContent += chunk.content;
                res.write(sseEvent('message.delta', { content: chunk.content }));
            }
            if (chunk.reasoningTokens !== undefined) {
                totalReasoningTokens = (totalReasoningTokens || 0) + chunk.reasoningTokens;
            }
        }

        // Save assistant message
        const assistantMsg = await conversationService.addMessage(conversationId, {
            role: 'assistant',
            content: fullAssistantContent,
            model: selectedModel.id,
            provider: selectedModel.provider,
        });

        res.write(sseEvent('message.completed', {
            messageId: assistantMsg.id,
            model: selectedModel.id,
            provider: selectedModel.provider,
            usage: totalReasoningTokens !== undefined ? { reasoningTokens: totalReasoningTokens } : undefined,
        }));

        if (titleGenerationPromise) {
            await titleGenerationPromise;
        }

        res.write(sseEvent('generation.done', {
            elapsedMs: Date.now() - startedAt,
            chunkCount,
        }));

        res.end();
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message === 'AbortError') {
            console.log(`[chat] Request aborted by client for conversation ${conversationId}`);
            return res.end();
        }

        console.error(`[chat] Error:`, error.message);
        if (!res.headersSent) {
            res.status(502).json({ error: error.message });
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ code: 'STREAM_ERROR', message: error.message })}\n\n`);
            res.end();
        }
    }
});

export { router as chatRouter };
