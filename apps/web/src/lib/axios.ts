import { createAIService } from "@/services/ai";
import { createAuthService } from "@/services/auth/service";
import { createConversationService } from "@/services/conversation";
import { createCredentialService } from "@/services/credential/service";
import axios from "axios";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

let refreshPromise: Promise<void> | null = null;

export const refreshAccessToken = async (): Promise<void> => {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = axios
        .post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
            {},
            {
                withCredentials: true,
            }
        )
        .then(() => undefined)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

apiClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest?._retry &&
            !originalRequest?._skipAuthRefresh
        ) {
            originalRequest._retry = true;

            try {
                await refreshAccessToken();

                return apiClient(originalRequest);
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const authService = createAuthService(apiClient);
export const aiService = createAIService(apiClient);
export const conversationService = createConversationService(apiClient);
export const credentialService = createCredentialService(apiClient);