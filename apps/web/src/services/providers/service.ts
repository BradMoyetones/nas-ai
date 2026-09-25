import type { AIProvider } from '@nas/shared';
import type { AxiosInstance } from 'axios';

export function createProvidersService(client: AxiosInstance) {
    return {
        async list(): Promise<AIProvider[]> {
            const { data } = await client.get<{ providers: AIProvider[] }>('/api/providers');
            return data.providers;
        },
    } as const
};
