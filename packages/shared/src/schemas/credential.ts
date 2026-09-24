import { z } from 'zod';

export const createCredentialSchema = z.object({
    providerId: z.string().min(1),
    apiKey: z.string().min(1, 'La API key no puede estar vacía'),
    label: z.string().max(100).optional(),
});

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
