import { env } from '../../config/env';
import type { AIModel } from './providers';
import { ProviderApiError } from './provider-error';
import type { ChatMessage, ProviderStreamChunk } from './types';

export const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1/chat/completions';

type CerebrasErrorPayload = {
    error?: {
        message?: string;
        type?: string;
        code?: string;
        param?: string | null;
    };
};

type CerebrasStreamEvent = {
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

function decodeSseLine(rawLine: string): CerebrasStreamEvent | null {
    const line = rawLine.trim();

    if (!line.startsWith('data:')) {
        return null;
    }

    const payload = line.slice(5).trim();

    if (!payload || payload === '[DONE]') {
        return null;
    }

    try {
        return JSON.parse(payload) as CerebrasStreamEvent;
    } catch {
        return null;
    }
}

function createAbortError(): Error {
    const error = new Error('Request aborted');

    error.name = 'AbortError';

    return error;
}

async function parseCerebrasErrorResponse(response: Response): Promise<ProviderApiError> {
    let message = `Cerebras request failed with status ${response.status}`;

    let providerCode: string | undefined;
    let rawBody: string | undefined;

    try {
        rawBody = await response.text();
    } catch {
        rawBody = undefined;
    }

    if (rawBody?.trim()) {
        try {
            const payload = JSON.parse(rawBody) as CerebrasErrorPayload;

            if (typeof payload.error?.message === 'string') {
                message = payload.error.message;
            }

            if (typeof payload.error?.code === 'string') {
                providerCode = payload.error.code;
            } else if (typeof payload.error?.type === 'string') {
                providerCode = payload.error.type;
            }
        } catch {
            /*
             * Si el provider no devuelve JSON,
             * conservamos el body como mensaje técnico.
             */

            message = rawBody.trim();
        }
    }

    return new ProviderApiError({
        provider: 'cerebras',
        status: response.status,
        message,
        providerCode,
        requestId: response.headers.get('x-request-id') ?? undefined,
    });
}

function createCerebrasStreamError(event: CerebrasStreamEvent): ProviderApiError {
    const error = event.error;

    return new ProviderApiError({
        provider: 'cerebras',
        message: error?.message ?? 'Cerebras returned a stream error.',
        providerCode: error?.code ?? error?.type,
    });
}

export function hasCerebrasKey(): boolean {
    return env.CEREBRAS_API_KEY.trim().length > 0;
}

export async function streamFromCerebras(params: {
    messages: ChatMessage[];
    model: AIModel;
    signal?: AbortSignal;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
    if (!hasCerebrasKey()) {
        throw new ProviderApiError({
            provider: 'cerebras',
            message: 'CEREBRAS_API_KEY no configurada',
            providerCode: 'MISSING_API_KEY',
        });
    }

    let response: Response;

    try {
        response = await fetch(CEREBRAS_BASE_URL, {
            method: 'POST',
            signal: params.signal,
            headers: {
                Authorization: `Bearer ${env.CEREBRAS_API_KEY}`,
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

        throw new ProviderApiError({
            provider: 'cerebras',
            message: error instanceof Error ? error.message : String(error),
            providerCode: 'NETWORK_ERROR',
            cause: error,
        });
    }

    /*
     * ============================================================
     * Error HTTP antes de iniciar el stream
     * ============================================================
     */

    if (!response.ok) {
        throw await parseCerebrasErrorResponse(response);
    }

    /*
     * ============================================================
     * El provider respondió correctamente pero no existe body
     * ============================================================
     */

    if (!response.body) {
        throw new ProviderApiError({
            provider: 'cerebras',
            status: response.status,
            message: 'Cerebras returned an empty response body.',
            requestId: response.headers.get('x-request-id') ?? undefined,
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
                     * Error dentro del stream
                     * ------------------------------------------------
                     */

                    if (event.error) {
                        throw createCerebrasStreamError(event);
                    }

                    /*
                     * ------------------------------------------------
                     * Texto
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
             * Flush final del TextDecoder
             * ========================================================
             */

            buffer += decoder.decode();

            /*
             * ========================================================
             * Procesar última línea
             * ========================================================
             *
             * Puede no venir terminada en "\n".
             */

            if (buffer.trim()) {
                const event = decodeSseLine(buffer);

                if (event?.error) {
                    throw createCerebrasStreamError(event);
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

            throw new ProviderApiError({
                provider: 'cerebras',
                message: error instanceof Error ? error.message : String(error),
                providerCode: 'STREAM_ERROR',
                cause: error,
            });
        } finally {
            reader.releaseLock();
        }
    })();
}
