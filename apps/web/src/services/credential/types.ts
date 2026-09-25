import z from "zod";

export const credentialCreateFormSchema = z.object({
    providerId: z.string().trim().min(1, "Provider is required"),
    apiKey: z.string().trim().min(1, "API key is required"),
    label: z.string().trim().optional(),
})

export type CredentialCreateFormValues = z.infer<typeof credentialCreateFormSchema>;