import type { AxiosInstance } from "axios";
import type { AuthCodeVerifyFormValues, AuthLoginFormValues, AuthRegisterFormValues } from "./types";
import type { LoginChallenge, User } from "@/types/models";

export function createAuthService(client: AxiosInstance) {
    return {
        register: async (values: AuthRegisterFormValues) => {
            const response = await client.post<{ message: string, user: Pick<User, 'id' | 'email' | 'username'> }>('/api/auth/register', values);
            return response.data;
        },
        verifyEmail: async (token: string) => {
            const response = await client.get<{ message: string }>(`/api/auth/verify-email/${token}`);
            return response.data;
        },
        login: async (values: AuthLoginFormValues) => {
            const response = await client.post<{ message: string, challenge: Pick<LoginChallenge, 'id' | 'expiresAt'> }>('/api/auth/login', values, { _skipAuthRefresh: true } as any);
            return response.data;
        },
        verifyLoginCode: async (values: AuthCodeVerifyFormValues) => {
            const response = await client.post<{ message: string, user: Pick<User, 'id' | 'email' | 'username' | 'isVerified'>, token: string, refreshToken: string }>('/api/auth/login/verify', values);
            return response.data;
        },
        getLoginChallenge: async (id: string) => {
            const response = await client.get<{ message: string, challenge: Pick<LoginChallenge, 'id' | 'expiresAt'> }>(`/api/auth/login/challenge/${id}`);
            return response.data;
        },
        refresh: async () => {
            const response = await client.post<{ message: string }>('/api/auth/refresh');
            return response.data;
        },
        logout: async () => {
            const response = await client.post<{ message: string }>('/api/auth/logout');
            return response.data;
        },
        me: async () => {
            const response = await client.get<{ user: Pick<User, 'id' | 'email' | 'username' | 'isVerified' | 'createdAt'> }>('/api/auth/me');
            return response.data;
        }
    } as const
}

export type AuthService = ReturnType<typeof createAuthService>;
