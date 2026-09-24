import type { AxiosInstance } from 'axios';

export interface ProviderCredentialInfo {
    id: string;
    providerId: string;
    label: string | null;
    isValid: boolean;
    lastValidated: string | null;
    createdAt: string;
    updatedAt: string;
}

export function createCredentialService(client: AxiosInstance) {
    return {
        async list(): Promise<ProviderCredentialInfo[]> {
            const { data } = await client.get('/api/credentials');
            return data.credentials;
        },

        async save(providerId: string, apiKey: string, label?: string): Promise<ProviderCredentialInfo> {
            const { data } = await client.post('/api/credentials', { providerId, apiKey, label });
            return data.credential;
        },

        async remove(providerId: string): Promise<void> {
            await client.delete(`/api/credentials/${providerId}`);
        },
    } as const
};
