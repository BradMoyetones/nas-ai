import type { ChatStreamEvent } from '@nas/shared';

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
 * Escribe un evento SSE tipado en un WritableStreamDefaultWriter.
 *
 * Devuelve false si el writer no está disponible o el stream está cerrado.
 */
export function writeChatStreamEvent<
    E extends ChatStreamEvent['event'],
>(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    event: E,
    data: ChatStreamData<E>,
): boolean {
    const payload = serializeSseEvent({
        event,
        data,
    } as ChatStreamEvent);

    try {
        const encoded = new TextEncoder().encode(payload);
        writer.write(encoded);
        return true;
    } catch {
        return false;
    }
}

/**
 * Finaliza de forma segura la conexión SSE.
 */
export function endChatStream(
    writer: WritableStreamDefaultWriter<Uint8Array>,
): void {
    try {
        writer.close();
    } catch {
        // Already closed
    }
}