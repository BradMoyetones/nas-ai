import { Router } from 'express';
import type { Request, Response } from 'express';
import { getModelById } from '../services/ai/providers';
import { streamFromOpenRouter } from '../services/ai/openrouter';
import { streamFromGroq } from '../services/ai/groq';
import { streamFromCerebras } from '../services/ai/cerebras';
import crypto from 'crypto';
import { prisma } from '../db';
import { streamFromGoogle } from '@/services/ai/google';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const { messages, modelId } = req.body;
    let { conversationId } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'El array de messages es requerido y no puede estar vacío.' });
    }

    // El último mensaje siempre es el del usuario que se acaba de enviar
    const lastUserMessage = messages[messages.length - 1];

    const targetModelId = modelId || 'openai/gpt-oss-120b';
    const selectedModel = getModelById(targetModelId);

    if (!selectedModel) {
        return res.status(404).json({ error: `Modelo no encontrado: ${targetModelId}` });
    }

    try {
        // --- GUARDADO EN DB: USUARIO ---
        if (!conversationId) {
            // Generar un título basado en las primeras palabras del mensaje
            const title = lastUserMessage.content.slice(0, 40) + (lastUserMessage.content.length > 40 ? '...' : '');
            
            const conversation = await prisma.conversation.create({
                data: {
                    userId: req.user!.userId,
                    title: title || 'Nueva conversación',
                }
            });
            conversationId = conversation.id;
        }

        // Guardar mensaje del usuario
        await prisma.message.create({
            data: {
                conversationId,
                role: 'user',
                content: lastUserMessage.content,
            }
        });

        // --- STREAMING LLM ---
        let stream;
        switch (selectedModel.provider) {
            case 'openrouter':
                stream = await streamFromOpenRouter({ messages, model: selectedModel });
                break;
            case 'groq':
                stream = await streamFromGroq({ messages, model: selectedModel });
                break;
            case 'cerebras':
                stream = await streamFromCerebras({ messages, model: selectedModel });
                break;
            case 'google':
                stream = await streamFromGoogle({ messages, model: selectedModel });
                break;
            default:
                return res.status(500).json({ error: 'Proveedor no soportado.' });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const sseEvent = (event: string, data: any) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        res.write(
            sseEvent('meta', {
                requestId,
                model: selectedModel.id,
                provider: selectedModel.provider,
                conversationId, // Retornamos el ID al frontend
            })
        );

        let chunkCount = 0;
        let responseChars = 0;
        let fullAssistantContent = '';

        for await (const chunk of stream) {
            chunkCount++;
            if (chunk.content) {
                fullAssistantContent += chunk.content;
                responseChars += chunk.content.length;
                res.write(
                    sseEvent('delta', {
                        content: chunk.content,
                    })
                );
            }
            if (chunk.reasoningTokens !== undefined) {
                res.write(
                    sseEvent('usage', {
                        reasoningTokens: chunk.reasoningTokens,
                    })
                );
            }
        }

        // --- GUARDADO EN DB: ASISTENTE ---
        await prisma.message.create({
            data: {
                conversationId,
                role: 'assistant',
                content: fullAssistantContent,
                model: selectedModel.id,
                provider: selectedModel.provider,
            }
        });

        res.write(
            sseEvent('done', {
                chunkCount,
                responseChars,
                elapsedMs: Date.now() - startedAt,
            })
        );
        res.end();
    } catch (error: any) {
        console.error(`[chat][${requestId}] Error:`, error.message);
        if (!res.headersSent) {
            res.status(502).json({ error: error.message });
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});

export { router as chatRouter };
