import type { OrganizationId } from "./types";
import type { IconKey } from "./registry";

export interface OrganizationDefinition {
    id: OrganizationId;
    name: string;
    icon: IconKey;
}

export const organizations = {

    openai: {
        id: "openai",
        name: "OpenAI",
        icon: "openai",
    },

    anthropic: {
        id: "anthropic",
        name: "Anthropic",
        icon: "anthropic",
    },

    google: {
        id: "google",
        name: "Google",
        icon: "google",
    },

    meta: {
        id: "meta",
        name: "Meta",
        icon: "meta",
    },

    mistral: {
        id: "mistral",
        name: "Mistral AI",
        icon: "mistral",
    },

    cohere: {
        id: "cohere",
        name: "Cohere",
        icon: "cohere",
    },

    xai: {
        id: "xai",
        name: "xAI",
        icon: "xai",
    },

    stability: {
        id: "stability",
        name: "Stability AI",
        icon: "stability",
    },

    microsoft: {
        id: "microsoft",
        name: "Microsoft",
        icon: "microsoft",
    },

    deepseek: {
        id: "deepseek",
        name: "DeepSeek",
        icon: "deepseek",
    },

    qwen: {
        id: "qwen",
        name: "Qwen",
        icon: "qwen",
    },

} as const satisfies Record<OrganizationId, OrganizationDefinition>;