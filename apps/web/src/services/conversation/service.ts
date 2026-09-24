import type { Conversation, Message } from "@/types/models";
import type { AxiosInstance } from "axios";

export type ConversationWithMessages = Conversation & {
    messages: Message[];
}

export function createConversationService(client: AxiosInstance) {
    return {
        getAll: async () => {
            const response = await client.get<{ conversations: Conversation[] }>('/api/conversations');
            return response.data;
        },
        getById: async (id: string) => {
            const response = await client.get<{ conversation: ConversationWithMessages }>(`/api/conversations/${id}`);
            return response.data;
        },
        create: async (title: string) => {
            const response = await client.post<{ conversation: Conversation }>(`/api/conversations`, { title });
            return response.data;
        },
        update: async (data: { id: string, title: string, systemPrompt?: string, defaultModel?: string }) => {
            const response = await client.patch<{ conversation: Conversation }>(`/api/conversations/${data.id}`, data);
            return response.data;
        },
        delete: async (id: string) => {
            const response = await client.delete<{ message: string }>(`/api/conversations/${id}`);
            return response.data;
        },
    } as const
}

export type ConversationService = ReturnType<typeof createConversationService>;
