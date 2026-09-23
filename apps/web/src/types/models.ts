import type { AIProviderId } from "@/services/ai/types";

export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserAuth {
    id: string;
    userId: string;
    refreshToken: string | null;
    lastLoginAt: string | null;
    failedAttempts: number;
    lockedUntil: string | null;
    totpSecret: string | null;
    totpEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface EmailVerification {
    id: string;
    userId: string;
    token: string;
    type: 'email_verification' | 'password_reset' | string;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
}

export interface LoginChallenge {
    id: string;
    userId: string;
    code: string;
    expiresAt: string;
    usedAt: string | null;
    attempts: number;
    createdAt: string;
}

export interface Conversation {
    id: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    model: string | null;
    provider: string | null;
    metadata: MessageMetadata | null;
    createdAt: string;
}

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