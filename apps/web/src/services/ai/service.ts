import type { AxiosInstance } from "axios";
import type { AICategory } from "@nas/shared";

export function createAIService(client: AxiosInstance) {
    return {
        getModels: async () => {
            const response = await client.get<{ categories: AICategory[] }>('/api/models');
            return response.data;
        }
    } as const
}

export type AIService = ReturnType<typeof createAIService>;
