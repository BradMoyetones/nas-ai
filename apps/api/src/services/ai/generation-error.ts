import type {
    GenerationErrorMetadata,
    AIModel,
    AIProviderId,
} from '@nas/shared';

import {
    ProviderApiError,
} from './provider-error';

export type GenerationErrorCode =
    | 'ABORTED'
    | 'RATE_LIMITED'
    | 'PROVIDER_AUTH_ERROR'
    | 'INVALID_REQUEST'
    | 'MODEL_NOT_FOUND'
    | 'PROVIDER_UNAVAILABLE'
    | 'PROVIDER_NETWORK_ERROR'
    | 'GENERATION_FAILED';

export interface GenerationError {
    /**
     * Código normalizado por nuestra aplicación.
     *
     * El frontend puede depender de estos códigos sin importar
     * qué provider se encuentre detrás.
     */
    code: GenerationErrorCode;

    provider: AIProviderId;

    modelId: string;

    /**
     * HTTP status original del provider, cuando exista.
     */
    status?: number;

    /**
     * Indica si la operación puede reintentarse.
     */
    retryable: boolean;

    /**
     * Mensaje técnico original.
     *
     * No debe mostrarse directamente al usuario.
     */
    message: string;

    /**
     * Mensaje seguro y amigable para el usuario.
     */
    userMessage: string;

    /**
     * Código original del provider.
     *
     * Ejemplos:
     *
     * - RESOURCE_EXHAUSTED
     * - INVALID_ARGUMENT
     * - insufficient_quota
     */
    providerCode?: string;

    /**
     * Request ID / trace ID del provider,
     * cuando exista.
     */
    requestId?: string;
}

/**
 * Obtiene una propiedad de un valor desconocido.
 *
 * Se mantiene como fallback para errores que no sean
 * ProviderApiError.
 */
function getProperty(
    value: unknown,
    property: string
): unknown {
    if (
        typeof value !== 'object' ||
        value === null
    ) {
        return undefined;
    }

    return (
        value as Record<string, unknown>
    )[property];
}

function getErrorMessage(
    error: unknown
): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (
        typeof error === 'object' &&
        error !== null
    ) {
        const message =
            getProperty(
                error,
                'message'
            );

        if (
            typeof message === 'string'
        ) {
            return message;
        }

        try {
            return JSON.stringify(
                error
            );
        } catch {
            return 'Unknown generation error';
        }
    }

    return String(error);
}

function getFallbackStatus(
    error: unknown
): number | undefined {
    const directStatus =
        getProperty(
            error,
            'status'
        );

    if (
        typeof directStatus === 'number'
    ) {
        return directStatus;
    }

    const statusCode =
        getProperty(
            error,
            'statusCode'
        );

    if (
        typeof statusCode === 'number'
    ) {
        return statusCode;
    }

    const response =
        getProperty(
            error,
            'response'
        );

    const responseStatus =
        getProperty(
            response,
            'status'
        );

    if (
        typeof responseStatus === 'number'
    ) {
        return responseStatus;
    }

    return undefined;
}

function getFallbackProviderCode(
    error: unknown
): string | undefined {
    const code =
        getProperty(
            error,
            'code'
        );

    if (
        typeof code === 'string'
    ) {
        return code;
    }

    return undefined;
}

function getFallbackRequestId(
    error: unknown
): string | undefined {
    const directRequestId =
        getProperty(
            error,
            'requestId'
        );

    if (
        typeof directRequestId ===
        'string'
    ) {
        return directRequestId;
    }

    const traceId =
        getProperty(
            error,
            'traceId'
        );

    if (
        typeof traceId === 'string'
    ) {
        return traceId;
    }

    const response =
        getProperty(
            error,
            'response'
        );

    const responseRequestId =
        getProperty(
            response,
            'requestId'
        );

    if (
        typeof responseRequestId ===
        'string'
    ) {
        return responseRequestId;
    }

    return undefined;
}

export function isAbortError(
    error: unknown
): boolean {
    if (!error) {
        return false;
    }

    /*
     * Primero comprobamos el caso estándar
     * de AbortError / ABORT_ERR.
     */

    if (
        typeof error === 'object' &&
        error !== null
    ) {
        const name =
            getProperty(
                error,
                'name'
            );

        if (
            name === 'AbortError'
        ) {
            return true;
        }

        const code =
            getProperty(
                error,
                'code'
            );

        if (
            code === 'ABORT_ERR'
        ) {
            return true;
        }
    }

    const message =
        getErrorMessage(
            error
        ).toLowerCase();

    return (
        message.includes(
            'aborterror'
        ) ||
        message.includes(
            'aborted'
        ) ||
        message.includes(
            'the operation was aborted'
        )
    );
}

/**
 * Normaliza cualquier error proveniente de un provider
 * a un contrato común para nuestra aplicación.
 */
export function normalizeGenerationError(
    error: unknown,
    model: AIModel
): GenerationError {
    /*
     * ============================================================
     * ProviderApiError
     * ============================================================
     *
     * Este es nuestro contrato ideal.
     *
     * El provider ya hizo el trabajo de extraer:
     *
     * - status
     * - providerCode
     * - requestId
     * - message
     */

    if (
        error instanceof ProviderApiError
    ) {
        const message =
            error.message;

        const status =
            error.status;

        const providerCode =
            error.providerCode;

        const requestId =
            error.requestId;

        /*
         * --------------------------------------------------------
         * Abort
         * --------------------------------------------------------
         */

        if (
            isAbortError(error)
        ) {
            return {
                code: 'ABORTED',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'La generación fue cancelada.',

                retryable: true,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Rate limit / quota
         * --------------------------------------------------------
         */

        if (
            status === 429 ||
            /rate.?limit|quota|too many requests|resource.?exhausted/i.test(
                message
            )
        ) {
            return {
                code: 'RATE_LIMITED',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'Este modelo alcanzó temporalmente su límite de uso. Intenta nuevamente en unos momentos.',

                retryable: true,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Authentication / authorization
         * --------------------------------------------------------
         */

        if (
            status === 401 ||
            status === 403
        ) {
            return {
                code:
                    'PROVIDER_AUTH_ERROR',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'El proveedor rechazó las credenciales utilizadas para este modelo.',

                retryable: false,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Bad request
         * --------------------------------------------------------
         *
         * Incluimos 422 porque providers compatibles con
         * OpenAI pueden utilizarlo para solicitudes semánticamente
         * inválidas.
         */

        if (
            status === 400 ||
            status === 422
        ) {
            return {
                code:
                    'INVALID_REQUEST',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'El proveedor rechazó la solicitud. Revisa el modelo seleccionado o el formato del contexto enviado.',

                retryable: false,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Model / resource not found
         * --------------------------------------------------------
         */

        if (
            status === 404
        ) {
            return {
                code:
                    'MODEL_NOT_FOUND',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'El modelo seleccionado no está disponible en este proveedor.',

                retryable: false,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Provider unavailable
         * --------------------------------------------------------
         */

        if (
            status !== undefined &&
            status >= 500
        ) {
            return {
                code:
                    'PROVIDER_UNAVAILABLE',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'El proveedor está presentando problemas temporales. Intenta nuevamente.',

                retryable: true,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Network errors
         * --------------------------------------------------------
         */

        if (
            /fetch failed|network|socket|econnreset|etimedout|enotfound|eai_again|connection reset|connection refused/i.test(
                message
            )
        ) {
            return {
                code:
                    'PROVIDER_NETWORK_ERROR',

                status,

                provider:
                    model.provider,

                modelId:
                    model.id,

                message,

                userMessage:
                    'No fue posible comunicarse con el proveedor. Intenta nuevamente.',

                retryable: true,

                providerCode,

                requestId,
            };
        }

        /*
         * --------------------------------------------------------
         * Fallback
         * --------------------------------------------------------
         */

        return {
            code:
                'GENERATION_FAILED',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'No fue posible generar una respuesta con este modelo.',

            retryable: false,

            providerCode,

            requestId,
        };
    }

    /*
     * ============================================================
     * Errores que todavía no fueron normalizados por un provider
     * ============================================================
     *
     * Este bloque mantiene compatibilidad con cualquier provider
     * que todavía lance un Error normal.
     */

    const message =
        getErrorMessage(
            error
        );

    const status =
        getFallbackStatus(
            error
        );

    const providerCode =
        getFallbackProviderCode(
            error
        );

    const requestId =
        getFallbackRequestId(
            error
        );

    /*
     * ------------------------------------------------------------
     * Abort
     * ------------------------------------------------------------
     */

    if (
        isAbortError(error)
    ) {
        return {
            code: 'ABORTED',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'La generación fue cancelada.',

            retryable: true,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Rate limit / quota
     * ------------------------------------------------------------
     */

    if (
        status === 429 ||
        /rate.?limit|quota|too many requests|resource.?exhausted/i.test(
            message
        )
    ) {
        return {
            code: 'RATE_LIMITED',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'Este modelo alcanzó temporalmente su límite de uso. Intenta nuevamente en unos momentos.',

            retryable: true,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Authentication / authorization
     * ------------------------------------------------------------
     */

    if (
        status === 401 ||
        status === 403
    ) {
        return {
            code:
                'PROVIDER_AUTH_ERROR',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'El proveedor rechazó las credenciales utilizadas para este modelo.',

            retryable: false,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Bad request
     * ------------------------------------------------------------
     */

    if (
        status === 400 ||
        status === 422
    ) {
        return {
            code:
                'INVALID_REQUEST',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'El proveedor rechazó la solicitud. Revisa el modelo seleccionado o el formato del contexto enviado.',

            retryable: false,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Not found
     * ------------------------------------------------------------
     */

    if (
        status === 404
    ) {
        return {
            code:
                'MODEL_NOT_FOUND',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'El modelo seleccionado no está disponible en este proveedor.',

            retryable: false,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Provider unavailable
     * ------------------------------------------------------------
     */

    if (
        status !== undefined &&
        status >= 500
    ) {
        return {
            code:
                'PROVIDER_UNAVAILABLE',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'El proveedor está presentando problemas temporales. Intenta nuevamente.',

            retryable: true,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Network errors
     * ------------------------------------------------------------
     */

    if (
        /fetch failed|network|socket|econnreset|etimedout|enotfound|eai_again|connection reset|connection refused/i.test(
            message
        )
    ) {
        return {
            code:
                'PROVIDER_NETWORK_ERROR',

            status,

            provider:
                model.provider,

            modelId:
                model.id,

            message,

            userMessage:
                'No fue posible comunicarse con el proveedor. Intenta nuevamente.',

            retryable: true,

            providerCode,

            requestId,
        };
    }

    /*
     * ------------------------------------------------------------
     * Fallback
     * ------------------------------------------------------------
     */

    return {
        code:
            'GENERATION_FAILED',

        status,

        provider:
            model.provider,

        modelId:
            model.id,

        message,

        userMessage:
            'No fue posible generar una respuesta con este modelo.',

        retryable: false,

        providerCode,

        requestId,
    };
}

/**
 * Convierte un error normalizado a metadata persistible
 * para Message.metadata.
 *
 * El mensaje visible para el usuario permanece en
 * GenerationError.userMessage.
 */
export function generationErrorToMetadata(
    error: GenerationError
): GenerationErrorMetadata {
    const metadata: GenerationErrorMetadata = {
        type: 'generation_error',

        code: error.code,

        provider:
            error.provider,

        modelId:
            error.modelId,

        retryable:
            error.retryable,
    };

    /*
     * Solo persistimos las propiedades opcionales cuando
     * realmente existen.
     */

    if (
        error.status !== undefined
    ) {
        metadata.status =
            error.status;
    }

    if (
        error.providerCode !==
        undefined
    ) {
        metadata.providerCode =
            error.providerCode;
    }

    if (
        error.message
    ) {
        metadata.technicalMessage =
            error.message;
    }

    if (
        error.requestId !==
        undefined
    ) {
        metadata.requestId =
            error.requestId;
    }

    return metadata;
}