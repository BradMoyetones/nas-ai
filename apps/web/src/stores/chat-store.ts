import { create } from 'zustand';

import type { Message } from '@/types/models';
import type { MessageMetadata } from '@nas/shared';

/**
 * Representación de un mensaje dentro del estado local
 * del chat.
 *
 * Usamos una forma propia para no acoplar el store a todos
 * los campos que pueda tener Message.
 */
export type ChatStoreMessage = {
    role: Message['role'];
    content: Message['content'];
    metadata: MessageMetadata | null;
};

interface ChatState {
    conversationId:
        | string
        | undefined;

    messages: ChatStoreMessage[];

    isStreaming: boolean;

    abortController:
        | AbortController
        | null;

    setConversationId: (
        id: string | undefined
    ) => void;

    setMessages: (
        messages: ChatStoreMessage[]
    ) => void;

    addMessage: (
        message: {
            role: Message['role'];
            content: Message['content'];
            metadata?: MessageMetadata | null;
        }
    ) => void;

    /**
     * Actualiza el contenido del último mensaje
     * y opcionalmente su metadata.
     *
     * Esto nos permite:
     *
     * - actualizar chunks durante streaming
     * - marcar el mensaje como error
     * - conservar metadata previa
     */
    updateLastMessage: (
        content: string,
        metadata?: MessageMetadata | null
    ) => void;

    /**
     * Actualiza únicamente la metadata del último mensaje.
     */
    updateLastMessageMetadata: (
        metadata:
            | MessageMetadata
            | null
    ) => void;

    setIsStreaming: (
        isStreaming: boolean
    ) => void;

    abortStream: () => void;

    reset: () => void;
}

export const useChatStore =
    create<ChatState>((set, get) => ({
        conversationId:
            undefined,

        messages: [],

        isStreaming: false,

        abortController:
            null,

        /*
         * ------------------------------------------------------------
         * Conversation
         * ------------------------------------------------------------
         */

        setConversationId: (
            id
        ) =>
            set({
                conversationId: id,
            }),

        /*
         * ------------------------------------------------------------
         * Messages
         * ------------------------------------------------------------
         */

        setMessages: (
            messages
        ) =>
            set({
                messages,
            }),

        addMessage: (
            message
        ) =>
            set((state) => ({
                messages: [
                    ...state.messages,
                    {
                        role:
                            message.role,

                        content:
                            message.content,

                        metadata:
                            message.metadata ??
                            null,
                    },
                ],
            })),

        updateLastMessage: (
            content,
            metadata
        ) =>
            set((state) => {
                if (
                    state.messages.length ===
                    0
                ) {
                    return state;
                }

                const messages = [
                    ...state.messages,
                ];

                const lastIndex =
                    messages.length - 1;

                const lastMessage =
                    messages[lastIndex];

                messages[lastIndex] = {
                    ...lastMessage,

                    content,

                    /*
                     * Solo reemplazamos metadata cuando
                     * el caller realmente la proporciona.
                     *
                     * Así los chunks normales del stream
                     * no borran una metadata existente.
                     */
                    ...(metadata !==
                        undefined && {
                        metadata,
                    }),
                };

                return {
                    messages,
                };
            }),

        updateLastMessageMetadata: (
            metadata
        ) =>
            set((state) => {
                if (
                    state.messages.length ===
                    0
                ) {
                    return state;
                }

                const messages = [
                    ...state.messages,
                ];

                const lastIndex =
                    messages.length - 1;

                messages[lastIndex] = {
                    ...messages[lastIndex],
                    metadata,
                };

                return {
                    messages,
                };
            }),

        /*
         * ------------------------------------------------------------
         * Streaming
         * ------------------------------------------------------------
         */

        setIsStreaming: (
            isStreaming
        ) => {
            if (isStreaming) {
                /*
                 * Cada nueva generación recibe su propio
                 * AbortController.
                 */
                set({
                    isStreaming: true,

                    abortController:
                        new AbortController(),
                });

                return;
            }

            set({
                isStreaming: false,
                abortController:
                    null,
            });
        },

        abortStream: () => {
            const {
                abortController,
            } = get();

            if (
                abortController
            ) {
                abortController.abort();

                set({
                    isStreaming:
                        false,

                    abortController:
                        null,
                });
            }
        },

        /*
         * ------------------------------------------------------------
         * Reset
         * ------------------------------------------------------------
         */

        reset: () =>
            set({
                conversationId:
                    undefined,

                messages: [],

                isStreaming: false,

                abortController:
                    null,
            }),
    }));

/**
 * Global event to notify sidebar
 * about a newly-created conversation.
 */
export const emitNewConversation = () => {
    window.dispatchEvent(
        new Event(
            'chat:new-conversation'
        )
    );
};

/**
 * Global event to notify sidebar
 * about a conversation title update.
 */
export const emitConversationTitle = (
    id: string,
    title: string
) => {
    window.dispatchEvent(
        new CustomEvent(
            'chat:conversation-title',
            {
                detail: {
                    id,
                    title,
                },
            }
        )
    );
};