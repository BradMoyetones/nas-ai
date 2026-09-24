/**
 * Tipos internos del módulo de IA (exclusivos del backend).
 *
 * Los tipos compartidos con el frontend viven en @nas/shared
 * y deben importarse directamente desde allí.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export type ProviderStreamChunk = {
    content?: string;
    reasoningTokens?: number;
};