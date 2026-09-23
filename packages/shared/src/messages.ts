import type { AIProviderId } from './providers';

/**
 * Metadata de error de generación asociada a un mensaje.
 *
 * Se persiste en la DB y se envía al frontend para mostrar
 * información contextual sobre fallos del proveedor.
 */
export type GenerationErrorMetadata = {
    type: 'generation_error';

    /**
     * Código normalizado por nuestra aplicación.
     *
     * Ejemplos:
     * - RATE_LIMITED
     * - PROVIDER_AUTH_ERROR
     * - INVALID_REQUEST
     * - MODEL_NOT_FOUND
     * - PROVIDER_UNAVAILABLE
     * - PROVIDER_NETWORK_ERROR
     * - GENERATION_FAILED
     */
    code: string;

    provider: AIProviderId;
    modelId: string;

    /**
     * HTTP status entregado por el provider, cuando exista.
     */
    status?: number;

    /**
     * Indica si la operación tiene sentido reintentarse.
     */
    retryable: boolean;

    /**
     * Código original proporcionado por el provider.
     *
     * Ejemplo en Google:
     * RESOURCE_EXHAUSTED
     * INVALID_ARGUMENT
     */
    providerCode?: string;

    /**
     * Mensaje técnico original del provider.
     *
     * Este dato sirve para debugging/observabilidad y NO debe
     * mostrarse directamente al usuario.
     */
    technicalMessage?: string;

    /**
     * Identificador de request/traza entregado por el provider,
     * cuando esté disponible.
     */
    requestId?: string;
};

/**
 * Metadata de cualquier mensaje persistido.
 *
 * Se utiliza como discriminated union para poder agregar
 * posteriormente otros tipos de metadata sin perder tipado.
 */
export type MessageMetadata =
    | GenerationErrorMetadata;
