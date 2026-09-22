import type { Response } from 'express';

import type { ChatStreamEvent } from './types';

/**
 * Obtiene el tipo de data asociado a un evento SSE concreto.
 *
 * Ejemplo:
 *
 * ChatStreamData<'message.error'>
 * →
 * {
 *     messageId?: string;
 *     model: string;
 *     provider: AIProviderId;
 *     code: string;
 *     status?: number;
 *     message: string;
 *     retryable: boolean;
 * }
 */
export type ChatStreamData<
    E extends ChatStreamEvent['event'],
> = Extract<
    ChatStreamEvent,
    { event: E }
>['data'];

/**
 * Serializa un evento SSE siguiendo el formato estándar:
 *
 * event: event.name
 * data: {...}
 *
 * \n\n
 */
function serializeSseEvent(
    event: ChatStreamEvent
): string {
    return (
        `event: ${event.event}\n` +
        `data: ${JSON.stringify(event.data)}\n\n`
    );
}

/**
 * Escribe un evento SSE tipado en la respuesta.
 *
 * Devuelve false si la conexión ya no está disponible.
 */
export function writeChatStreamEvent<
    E extends ChatStreamEvent['event'],
>(
    res: Response,
    event: E,
    data: ChatStreamData<E>,
): boolean {
    if (
        res.writableEnded ||
        res.destroyed
    ) {
        return false;
    }

    const payload = serializeSseEvent({
        event,
        data,
    } as ChatStreamEvent);

    res.write(payload);

    return true;
}

/**
 * Finaliza de forma segura la conexión SSE.
 */
export function endChatStream(
    res: Response
): void {
    if (
        !res.writableEnded &&
        !res.destroyed
    ) {
        res.end();
    }
}