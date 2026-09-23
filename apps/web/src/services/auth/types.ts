import { z } from "zod";

export const authRegisterSchema = z.object({
    username: z.string().min(3),
    email: z.email(),
    password: z.string().min(8),
})


export const authLoginSchema = z.object({
    email: z.email(),
    password: z.string(),
})

export const authCodeVerifySchema = z.object({
    challengeId: z.string(),
    code: z.string().length(6),
})

export type AuthRegisterFormValues = z.infer<typeof authRegisterSchema>;
export type AuthLoginFormValues = z.infer<typeof authLoginSchema>;
export type AuthCodeVerifyFormValues = z.infer<typeof authCodeVerifySchema>;