/**
 * Tipos internos del módulo de IA (exclusivos del backend).
 *
 * Los tipos compartidos con el frontend viven en @nas/shared
 * y deben importarse directamente desde allí.
 *
 * NOTA: Con la integración del AI SDK, los tipos ChatMessage y
 * ProviderStreamChunk ya no se usan. El AI SDK maneja su propio
 * formato de mensajes internamente.
 */

export type ChatRole = 'system' | 'user' | 'assistant';