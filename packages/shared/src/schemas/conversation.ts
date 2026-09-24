import { z } from 'zod';

export const createConversationSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    systemPrompt: z.string().max(4000).optional(),
    defaultModel: z.string().optional(),
});

export const updateConversationSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    systemPrompt: z.string().max(4000).nullable().optional(),
    defaultModel: z.string().nullable().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
