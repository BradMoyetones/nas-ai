import { create } from 'zustand';

interface ConversationStore {
    /** Mapa de actualizaciones de título pendientes */
    titleUpdates: Record<string, string>;
    /** Signal para refetch */
    invalidationKey: number;
    
    updateTitle: (id: string, title: string) => void;
    invalidate: () => void;
    clearTitleUpdate: (id: string) => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
    titleUpdates: {},
    invalidationKey: 0,
    
    updateTitle: (id, title) => set((s) => ({
        titleUpdates: { ...s.titleUpdates, [id]: title },
    })),
    
    invalidate: () => set((s) => ({ invalidationKey: s.invalidationKey + 1 })),
    
    clearTitleUpdate: (id) => set((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...rest } = s.titleUpdates;
        return { titleUpdates: rest };
    }),
}));
