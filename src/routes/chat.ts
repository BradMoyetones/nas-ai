import { Router } from 'express';
import type { Request, Response } from 'express';
import { getModelById } from '../services/ai/providers';
import { streamFromOpenRouter } from '../services/ai/openrouter';
import { streamFromGroq } from '../services/ai/groq';
import { streamFromCerebras } from '../services/ai/cerebras';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();
    const { messages, modelId } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'El array de messages es requerido y no puede estar vacío.' });
    }

    // Si no se envía modelId, elegimos un modelo por defecto (ej. llama-3.1-8b-instant de groq)
    const targetModelId = modelId || 'llama-3.3-70b-versatile';
    const selectedModel = getModelById(targetModelId);

    if (!selectedModel) {
        return res.status(404).json({ error: `Modelo no encontrado: ${targetModelId}` });
    }

    try {
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
            })
        );

        let chunkCount = 0;
        let responseChars = 0;

        for await (const chunk of stream) {
            chunkCount++;
            if (chunk.content) {
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
