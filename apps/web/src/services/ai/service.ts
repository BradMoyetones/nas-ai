import type { AxiosInstance } from "axios";

export interface AIModel {
    id: string;
    name: string;
    description: string;
    icon: string;
    provider: 'openrouter' | 'groq' | 'cerebras' | 'google';
    enabled: boolean;
}

export interface AICategory {
    category: string;
    models: AIModel[];
}


export function createAIService(client: AxiosInstance) {
    return {
        getModels: async () => {
            const response = await client.get<{ categories: AICategory[] }>('/api/models');
            return response.data;
        }
    } as const
}

export type AIService = ReturnType<typeof createAIService>;
