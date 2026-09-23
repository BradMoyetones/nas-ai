import type { AIProviderId } from "@/services/ai/types";

export type ChatRole = 'system' | 'user' | 'assistant';

export type GenerationErrorMetadata = {
    type: 'generation_error';

    code: string;

    provider: AIProviderId;
    modelId: string;

    status?: number;

    retryable: boolean;

    providerCode?: string;

    /**
     * Error técnico del proveedor.
     * No debe mostrarse directamente al usuario.
     */
    technicalMessage?: string;

    /**
     * Identificador de request/traza del proveedor,
     * cuando esté disponible.
     */
    requestId?: string;
};

export type MessageMetadata = GenerationErrorMetadata;

/**
 * Mensaje almacenado en nuestra aplicación.
 */
export type StoredMessage = {
    id: string;

    role: ChatRole;

    content: string;

    model: string | null;

    provider: AIProviderId | null;

    metadata: MessageMetadata | null;

    createdAt: Date;
};