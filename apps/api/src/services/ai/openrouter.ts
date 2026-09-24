import { env } from '../../config/env';

import type { AIModel } from '@nas/shared';

import {
    ProviderApiError,
} from './provider-error';

import type {
    ChatMessage,
    ProviderStreamChunk,
} from './types';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

type OpenRouterErrorPayload = {
    error?: {
        message?: string;
        type?: string;
        code?: string | number;
        param?: string | null;
    };
};

type OpenRouterStreamEvent = {
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
        code?: string | number;
        param?: string | null;
    };
};

function decodeSseLine(
    rawLine: string
): OpenRouterStreamEvent | null {
    const line = rawLine.trim();

    if (!line.startsWith('data:')) {
        return null;
    }

    const payload =
        line.slice(5).trim();

    if (
        !payload ||
        payload === '[DONE]'
    ) {
        return null;
    }

    try {
        return JSON.parse(
            payload
        ) as OpenRouterStreamEvent;
    } catch {
        return null;
    }
}

function createAbortError(): Error {
    const error = new Error(
        'Request aborted'
    );

    error.name = 'AbortError';

    return error;
}

function normalizeProviderCode(
    code:
        | string
        | number
        | undefined
): string | undefined {
    if (code === undefined) {
        return undefined;
    }

    return String(code);
}

async function parseOpenRouterErrorResponse(
    response: Response
): Promise<ProviderApiError> {
    let message =
        `OpenRouter request failed with status ${response.status}`;

    let providerCode:
        | string
        | undefined;

    let rawBody: string | undefined;

    try {
        rawBody =
            await response.text();
    } catch {
        rawBody = undefined;
    }

    if (rawBody?.trim()) {
        try {
            const payload =
                JSON.parse(
                    rawBody
                ) as OpenRouterErrorPayload;

            if (
                typeof payload.error?.message ===
                'string'
            ) {
                message =
                    payload.error.message;
            }

            providerCode =
                normalizeProviderCode(
                    payload.error?.code
                ) ??
                payload.error?.type;
        } catch {
            /*
             * Si la respuesta no es JSON,
             * usamos el body como mensaje técnico.
             */

            message =
                rawBody.trim();
        }
    }

    return new ProviderApiError({
        provider: 'openrouter',

        status:
            response.status,

        message,

        providerCode,

        requestId:
            response.headers.get(
                'x-request-id'
            ) ??
            undefined,
    });
}

function createOpenRouterStreamError(
    event: OpenRouterStreamEvent
): ProviderApiError {
    const error =
        event.error;

    return new ProviderApiError({
        provider: 'openrouter',

        message:
            error?.message ??
            'OpenRouter returned a stream error.',

        providerCode:
            normalizeProviderCode(
                error?.code
            ) ??
            error?.type,
    });
}

export function hasOpenRouterKey(): boolean {
    return (
        env.OPENROUTER_API_KEY.trim().length >
        0
    );
}

export async function streamFromOpenRouter(
    params: {
        messages: ChatMessage[];
        model: AIModel;
        signal?: AbortSignal;
    }
): Promise<
    AsyncGenerator<ProviderStreamChunk>
> {
    if (!hasOpenRouterKey()) {
        throw new ProviderApiError({
            provider: 'openrouter',

            message:
                'OPENROUTER_API_KEY no configurada',

            providerCode:
                'MISSING_API_KEY',
        });
    }

    let response: Response;

    try {
        response = await fetch(
            OPENROUTER_BASE_URL,
            {
                method: 'POST',

                signal:
                    params.signal,

                headers: {
                    Authorization:
                        `Bearer ${env.OPENROUTER_API_KEY}`,

                    'Content-Type':
                        'application/json',

                    /*
                     * OpenRouter los documenta como headers
                     * opcionales para identificar la aplicación.
                     */

                    'HTTP-Referer':
                        'http://localhost:3000',

                    'X-Title':
                        'NAS AI API',
                },

                body: JSON.stringify({
                    model:
                        params.model.id,

                    messages:
                        params.messages,

                    stream: true,
                }),
            }
        );
    } catch (error) {
        if (
            params.signal?.aborted
        ) {
            throw createAbortError();
        }

        throw new ProviderApiError({
            provider: 'openrouter',

            message:
                error instanceof Error
                    ? error.message
                    : String(error),

            providerCode:
                'NETWORK_ERROR',

            cause: error,
        });
    }

    /*
     * ============================================================
     * Error HTTP antes de comenzar el stream
     * ============================================================
     */

    if (!response.ok) {
        throw await parseOpenRouterErrorResponse(
            response
        );
    }

    /*
     * ============================================================
     * Validar body
     * ============================================================
     */

    if (!response.body) {
        throw new ProviderApiError({
            provider: 'openrouter',

            status:
                response.status,

            message:
                'OpenRouter returned an empty response body.',

            requestId:
                response.headers.get(
                    'x-request-id'
                ) ??
                undefined,
        });
    }

    /*
     * ============================================================
     * Reader
     * ============================================================
     */

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder();

    return (async function* () {
        let buffer = '';

        try {
            while (true) {
                const {
                    value,
                    done,
                } =
                    await reader.read();

                if (done) {
                    break;
                }

                if (
                    params.signal?.aborted
                ) {
                    throw createAbortError();
                }

                buffer +=
                    decoder.decode(
                        value,
                        {
                            stream: true,
                        }
                    );

                const lines =
                    buffer.split('\n');

                buffer =
                    lines.pop() ?? '';

                for (
                    const line of lines
                ) {
                    const event =
                        decodeSseLine(
                            line
                        );

                    if (!event) {
                        continue;
                    }

                    /*
                     * ------------------------------------------------
                     * Error dentro del stream
                     * ------------------------------------------------
                     */

                    if (event.error) {
                        throw createOpenRouterStreamError(
                            event
                        );
                    }

                    /*
                     * ------------------------------------------------
                     * Texto
                     * ------------------------------------------------
                     */

                    const content =
                        event
                            .choices?.[0]
                            ?.delta?.content;

                    if (
                        typeof content ===
                        'string' &&
                        content.length > 0
                    ) {
                        yield {
                            content,
                        };
                    }

                    /*
                     * ------------------------------------------------
                     * Reasoning tokens
                     * ------------------------------------------------
                     *
                     * OpenRouter puede entregar usage en el
                     * chunk final del streaming response.
                     */

                    const reasoningTokens =
                        event
                            .usage
                            ?.completion_tokens_details
                            ?.reasoning_tokens ??
                        event
                            .usage
                            ?.completionTokensDetails
                            ?.reasoningTokens;

                    if (
                        typeof reasoningTokens ===
                        'number'
                    ) {
                        yield {
                            reasoningTokens,
                        };
                    }
                }
            }

            /*
             * ========================================================
             * Flush final del decoder
             * ========================================================
             */

            buffer +=
                decoder.decode();

            /*
             * ========================================================
             * Procesar último fragmento pendiente
             * ========================================================
             */

            if (buffer.trim()) {
                const event =
                    decodeSseLine(
                        buffer
                    );

                if (!event) {
                    return;
                }

                if (event.error) {
                    throw createOpenRouterStreamError(
                        event
                    );
                }

                const content =
                    event
                        .choices?.[0]
                        ?.delta?.content;

                if (
                    typeof content ===
                    'string' &&
                    content.length > 0
                ) {
                    yield {
                        content,
                    };
                }

                const reasoningTokens =
                    event
                        .usage
                        ?.completion_tokens_details
                        ?.reasoning_tokens ??
                    event
                        .usage
                        ?.completionTokensDetails
                        ?.reasoningTokens;

                if (
                    typeof reasoningTokens ===
                    'number'
                ) {
                    yield {
                        reasoningTokens,
                    };
                }
            }
        } catch (error) {
            if (
                params.signal?.aborted
            ) {
                throw createAbortError();
            }

            if (
                error instanceof
                ProviderApiError
            ) {
                throw error;
            }

            throw new ProviderApiError({
                provider: 'openrouter',

                message:
                    error instanceof Error
                        ? error.message
                        : String(error),

                providerCode:
                    'STREAM_ERROR',

                cause: error,
            });
        } finally {
            reader.releaseLock();
        }
    })();
}