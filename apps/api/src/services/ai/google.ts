import {
    ApiError,
    GoogleGenAI,
} from '@google/genai';

import { env } from '../../config/env';

import type { AIModel } from './providers';

import {
    ProviderApiError,
} from './provider-error';

import type {
    ChatMessage,
    ProviderStreamChunk,
} from './types';

export const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
});

export function hasGoogleKey(): boolean {
    return (
        env.GEMINI_API_KEY.trim().length > 0
    );
}

function createAbortError(): Error {
    const error = new Error(
        'Request aborted'
    );

    error.name = 'AbortError';

    return error;
}

/**
 * Intenta obtener un valor de una propiedad sin asumir
 * la estructura concreta del error.
 */
function getErrorProperty(
    error: unknown,
    property: string
): unknown {
    if (
        typeof error !== 'object' ||
        error === null
    ) {
        return undefined;
    }

    return (
        error as Record<string, unknown>
    )[property];
}

/**
 * Convierte los errores propios de Google al error común
 * utilizado por todos los providers.
 */
function normalizeGoogleError(
    error: unknown,
    signal?: AbortSignal
): Error {
    /*
     * Si el cliente canceló la generación, no debemos
     * convertir la cancelación en un error del provider.
     */

    if (signal?.aborted) {
        return createAbortError();
    }

    /*
     * @google/genai expone ApiError con status y message.
     */

    if (error instanceof ApiError) {
        const providerCode = getErrorProperty(
            error,
            'code'
        );

        const requestId =
            getErrorProperty(
                error,
                'requestId'
            );

        return new ProviderApiError({
            provider: 'google',

            message: error.message,

            status: error.status,

            providerCode:
                typeof providerCode === 'string'
                    ? providerCode
                    : undefined,

            requestId:
                typeof requestId === 'string'
                    ? requestId
                    : undefined,

            cause: error,
        });
    }

    /*
     * Si otro punto del provider ya produjo un
     * ProviderApiError, lo dejamos intacto.
     */

    if (
        error instanceof
        ProviderApiError
    ) {
        return error;
    }

    /*
     * Otros errores normales de JavaScript
     * (network, AbortError, etc.).
     */

    if (error instanceof Error) {
        return error;
    }

    return new Error(
        String(error)
    );
}

export async function streamFromGoogle(
    params: {
        messages: ChatMessage[];
        model: AIModel;
        signal?: AbortSignal;
    }
): Promise<
    AsyncGenerator<ProviderStreamChunk>
> {
    if (!hasGoogleKey()) {
        throw new ProviderApiError({
            provider: 'google',

            message:
                'GEMINI_API_KEY no configurada',

            providerCode:
                'MISSING_API_KEY',
        });
    }

    /*
     * ------------------------------------------------------------
     * System instruction
     * ------------------------------------------------------------
     */

    const systemMessage =
        params.messages.find(
            (message) =>
                message.role === 'system'
        );

    /*
     * ------------------------------------------------------------
     * Conversación
     * ------------------------------------------------------------
     *
     * Gemini utiliza:
     *
     * user  → user
     * assistant → model
     *
     * system se envía mediante systemInstruction.
     */

    const contents =
        params.messages
            .filter(
                (message) =>
                    message.role !==
                    'system'
            )
            .map((message) => ({
                role:
                    message.role ===
                    'assistant'
                        ? 'model'
                        : 'user',

                parts: [
                    {
                        text:
                            message.content,
                    },
                ],
            }));

    try {
        /*
         * --------------------------------------------------------
         * Iniciar stream de Gemini
         * --------------------------------------------------------
         *
         * generateContentStream() devuelve un AsyncGenerator.
         */

        const response =
            await ai.models.generateContentStream(
                {
                    model: params.model.id,

                    contents,

                    config: {
                        systemInstruction:
                            systemMessage?.content,

                        abortSignal:
                            params.signal,
                    },
                }
            );

        /*
         * --------------------------------------------------------
         * Adaptar Gemini → ProviderStreamChunk
         * --------------------------------------------------------
         */

        return (async function* () {
            try {
                for await (
                    const chunk of response
                ) {
                    /*
                     * Si el cliente cerró el SSE,
                     * detener inmediatamente la generación.
                     */

                    if (
                        params.signal?.aborted
                    ) {
                        throw createAbortError();
                    }

                    const text =
                        chunk.text;

                    if (text) {
                        yield {
                            content: text,
                        };
                    }

                    /*
                     * Por ahora solo exponemos texto.
                     *
                     * Más adelante podremos mapear usage,
                     * thinking/reasoning u otros datos de Gemini
                     * al ProviderStreamChunk.
                     */
                }
            } catch (error) {
                throw normalizeGoogleError(
                    error,
                    params.signal
                );
            }
        })();
    } catch (error) {
        /*
         * Error al iniciar la generación.
         *
         * Aquí puede entrar:
         * - 400
         * - 401
         * - 403
         * - 404
         * - 429
         * - 500+
         * - network errors
         * - AbortError
         */

        console.error(
            '[google] Error generating content stream',
            {
                model: params.model.id,

                error,

                status:
                    error instanceof
                    ApiError
                        ? error.status
                        : undefined,

                message:
                    error instanceof Error
                        ? error.message
                        : String(error),
            }
        );

        throw normalizeGoogleError(
            error,
            params.signal
        );
    }
}