/**
 * Tipos del modelo de datos (exclusivos del frontend).
 *
 * Los tipos compartidos con el backend viven en @nas/shared
 * y deben importarse directamente desde allí.
 */

export interface User {
    id: string;
    username: string;
    email: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Conversation {
    id: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
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

export interface Message {
    id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    model: string | null;
    provider: string | null;
    metadata: import('@nas/shared').MessageMetadata | null;
    createdAt: string;
}