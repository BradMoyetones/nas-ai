import { useConversationStore } from './conversation-store';

export function emitNewConversation() {
    useConversationStore.getState().invalidate();
}

export function emitConversationTitle(id: string, title: string) {
    useConversationStore.getState().updateTitle(id, title);
}