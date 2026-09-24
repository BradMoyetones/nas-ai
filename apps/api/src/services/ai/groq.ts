import { env } from '../../config/env';

import type { AIModel } from '@nas/shared';

import { ProviderApiError } from './provider-error';

import type { ChatMessage, ProviderStreamChunk } from './types';

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

type GroqErrorPayload = {
    error?: {
        message?: string;
        type?: string;
        code?: string;
        param?: string | null;
    };
};

type GroqStreamEvent = {
    choices?: Array<{
        delta?: {
            content?: string | null;
        };
    }>;
    usage?: {
        completion_tokens_details?: {
            reasoning_tokens?: number;
        };

        completionTokensDetails?: {
            reasoningTokens?: number;
        };
    };
    error?: {
        message?: string;
        type?: string;
        code?: string;
        param?: string | null;
    };
};

function decodeSseLine(rawLine: string): GroqStreamEvent | null {
    const line = rawLine.trim();

    if (!line.startsWith('data:')) {
        return null;
    }

    const payload = line.slice(5).trim();

    if (!payload || payload === '[DONE]') {
        return null;
    }

    try {
        return JSON.parse(payload) as GroqStreamEvent;
    } catch {
        return null;
    }
}

function createAbortError(): Error {
    const error = new Error('Request aborted');

    error.name = 'AbortError';

    return error;
}

async function parseGroqErrorResponse(response: Response): Promise<ProviderApiError> {
    let message = `Groq request failed with status ${response.status}`;
    let providerCode: string | undefined;

    try {
        const payload = (await response.json()) as GroqErrorPayload;

        if (typeof payload.error?.message === 'string') {
            message = payload.error.message;
        }

        if (typeof payload.error?.code === 'string') {
            providerCode = payload.error.code;
        }

        if (!providerCode && typeof payload.error?.type === 'string') {
            providerCode = payload.error.type;
        }
    } catch {
        /*
         * El body no era JSON.
         *
         * Intentamos obtenerlo como texto
         * para no perder información.
         */

        try {
            const text = await response.text();

            if (text.trim()) {
                message = text.trim();
            }
        } catch {
            // Conservamos el mensaje por defecto.
        }
    }

    return new ProviderApiError({
        provider: 'groq',
        status: response.status,
        message,
        providerCode,
        requestId: response.headers.get('x-request-id') ?? response.headers.get('x-groq-request-id') ?? undefined,
    });
}

function createGroqStreamError(event: GroqStreamEvent): ProviderApiError {
    const error = event.error;
    return new ProviderApiError({
        provider: 'groq',
        message: error?.message ?? 'Groq returned a stream error.',
        providerCode: error?.code ?? error?.type,
    });
}

export function hasGroqKey(): boolean {
    return env.GROQ_API_KEY.trim().length > 0;
}

export async function streamFromGroq(params: {
    messages: ChatMessage[];
    model: AIModel;
    signal?: AbortSignal;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
    if (!hasGroqKey()) {
        throw new ProviderApiError({
            provider: 'groq',
            message: 'GROQ_API_KEY no configurada',
            providerCode: 'MISSING_API_KEY',
        });
    }

    let response: Response;

    try {
        response = await fetch(GROQ_BASE_URL, {
            method: 'POST',
            signal: params.signal,
            headers: {
                Authorization: `Bearer ${env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: params.model.id,
                messages: params.messages,
                stream: true,
            }),
        });
    } catch (error) {
        if (params.signal?.aborted) {
            throw createAbortError();
        }

        throw error;
    }

    /*
     * ============================================================
     * Error HTTP antes de comenzar el stream
     * ============================================================
     */

    if (!response.ok) {
        throw await parseGroqErrorResponse(response);
    }

    if (!response.body) {
        throw new ProviderApiError({
            provider: 'groq',
            status: response.status,
            message: 'Groq returned an empty response body.',
            requestId: response.headers.get('x-request-id') ?? response.headers.get('x-groq-request-id') ?? undefined,
        });
    }

    /*
     * ============================================================
     * Reader
     * ============================================================
     */

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return (async function* () {
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                if (params.signal?.aborted) {
                    throw createAbortError();
                }

                buffer += decoder.decode(value, {
                    stream: true,
                });

                const lines = buffer.split('\n');

                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    const event = decodeSseLine(line);

                    if (!event) {
                        continue;
                    }

                    /*
                     * ------------------------------------------------
                     * Error recibido dentro del stream
                     * ------------------------------------------------
                     */

                    if (event.error) {
                        throw createGroqStreamError(event);
                    }

                    /*
                     * ------------------------------------------------
                     * Content delta
                     * ------------------------------------------------
                     */

                    const content = event.choices?.[0]?.delta?.content;

                    if (typeof content === 'string' && content.length > 0) {
                        yield {
                            content,
                        };
                    }

                    /*
                     * ------------------------------------------------
                     * Reasoning tokens
                     * ------------------------------------------------
                     */

                    const reasoningTokens =
                        event.usage?.completion_tokens_details?.reasoning_tokens ??
                        event.usage?.completionTokensDetails?.reasoningTokens;

                    if (typeof reasoningTokens === 'number') {
                        yield {
                            reasoningTokens,
                        };
                    }
                }
            }

            /*
             * ========================================================
             * Procesar el último fragmento pendiente
             * ========================================================
             *
             * Puede existir una última línea sin "\n".
             */

            if (buffer.trim()) {
                const event = decodeSseLine(buffer);

                if (event?.error) {
                    throw createGroqStreamError(event);
                }

                const content = event?.choices?.[0]?.delta?.content;

                if (typeof content === 'string' && content.length > 0) {
                    yield {
                        content,
                    };
                }

                const reasoningTokens =
                    event?.usage?.completion_tokens_details?.reasoning_tokens ??
                    event?.usage?.completionTokensDetails?.reasoningTokens;

                if (typeof reasoningTokens === 'number') {
                    yield {
                        reasoningTokens,
                    };
                }
            }
        } catch (error) {
            if (params.signal?.aborted) {
                throw createAbortError();
            }

            if (error instanceof ProviderApiError) {
                throw error;
            }

            throw error;
        } finally {
            reader.releaseLock();
        }
    })();
}
