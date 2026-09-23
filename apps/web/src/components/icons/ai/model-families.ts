import type {
    ModelFamilyId,
    OrganizationId,
} from "./types";

import type { IconKey } from "./registry";

export interface ModelFamilyDefinition {
    id: ModelFamilyId;
    name: string;
    owner: OrganizationId;
    icon: IconKey;
    patterns: readonly RegExp[];
}

export const modelFamilies = {

    gpt: {
        id: "gpt",
        name: "GPT",
        owner: "openai",
        icon: "openai",

        patterns: [
            /^gpt/i,
            /^openai\/gpt/i,
        ],
    },

    claude: {
        id: "claude",
        name: "Claude",
        owner: "anthropic",
        icon: "claude",

        patterns: [
            /^claude/i,
            /^anthropic\/claude/i,
        ],
    },

    gemini: {
        id: "gemini",
        name: "Gemini",
        owner: "google",
        icon: "gemini",

        patterns: [
            /^gemini/i,
            /^google\/gemini/i,
        ],
    },

    llama: {
        id: "llama",
        name: "Llama",
        owner: "meta",
        icon: "meta",

        patterns: [
            /^llama/i,
            /^meta-llama/i,
            /^meta\/llama/i,
        ],
    },

    grok: {
        id: "grok",
        name: "Grok",
        owner: "xai",
        icon: "grok",

        patterns: [
            /^grok/i,
            /^xai\/grok/i,
        ],
    },

    deepseek: {
        id: "deepseek",
        name: "DeepSeek",
        owner: "deepseek",
        icon: "deepseek",

        patterns: [
            /^deepseek/i,
        ],
    },

    qwen: {
        id: "qwen",
        name: "Qwen",
        owner: "qwen",
        icon: "qwen",

        patterns: [
            /^qwen/i,
        ],
    },

    whisper: {
        id: "whisper",
        name: "Whisper",
        owner: "openai",
        icon: "openai",

        patterns: [
            /^whisper/i,
            /^openai\/whisper/i,
        ],
    },

    phi: {
        id: "phi",
        name: "Phi",
        owner: "microsoft",
        icon: "microsoft",

        patterns: [
            /^phi/i,
            /^microsoft\/phi/i,
        ],
    },

} as const satisfies Record<ModelFamilyId, ModelFamilyDefinition>;