import { z } from 'zod';

export const chatMessageSchema = z.object({
    content: z.string().min(1, 'El mensaje no puede estar vacío'),
    conversationId: z.string().uuid().optional(),
    modelId: z.string().min(1, 'Debe seleccionar un modelo'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
