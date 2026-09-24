/**
 * Eventos globales para notificar al sidebar
 * sobre cambios en las conversaciones.
 *
 * Usamos window events porque el sidebar y el chat
 * están en árboles de componentes separados.
 */

export const emitNewConversation = () => {
    window.dispatchEvent(
        new Event('chat:new-conversation')
    );
};

export const emitConversationTitle = (
    id: string,
    title: string
) => {
    window.dispatchEvent(
        new CustomEvent('chat:conversation-title', {
            detail: { id, title },
        })
    );
};