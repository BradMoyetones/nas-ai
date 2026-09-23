import type { ProviderId } from "./types";
import type { IconKey } from "./registry";

export interface ProviderDefinition {
    id: ProviderId;
    name: string;
    icon: IconKey;
}

export const providers = {
    openrouter: {
        id: "openrouter",
        name: "OpenRouter",
        icon: "openrouter",
    },
    groq: {
        id: "groq",
        name: "Groq",
        icon: "groq",
    },
    cerebras: {
        id: "cerebras",
        name: "Cerebras",
        icon: "cerebras",
    },
    google: {
        id: "google",
        name: "Google",
        icon: "google",
    },
} as const satisfies Record<ProviderId, ProviderDefinition>;