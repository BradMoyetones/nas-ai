import type { AxiosInstance } from 'axios';
import type { CredentialCreateFormValues } from './types';

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

        async save(data: CredentialCreateFormValues): Promise<ProviderCredentialInfo> {
            const res = await client.post('/api/credentials', data);
            return res.data.credential;
        },

        async remove(id: string): Promise<{ message: string }> {
            const res = await client.delete<{ message: string }>(`/api/credentials/${id}`);
            return res.data;
        },
    } as const
};
