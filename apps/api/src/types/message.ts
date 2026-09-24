/**
 * Tipos de mensajes persistidos (exclusivos del backend).
 *
 * Los tipos compartidos con el frontend viven en @nas/shared
 * y deben importarse directamente desde allí.
 */

import type { MessageMetadata } from '@nas/shared';

export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * Mensaje almacenado en nuestra aplicación.
 */
export type StoredMessage = {
    id: string;

    role: ChatRole;

    content: string;

    model: string | null;

    provider: string | null;

    metadata: MessageMetadata | null;

    createdAt: Date;
};