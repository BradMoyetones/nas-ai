import type {
    ProductId,
    OrganizationId,
} from "./types";

import type { IconKey } from "./registry";

export interface ProductDefinition {
    id: ProductId;
    name: string;
    owner: OrganizationId;
    icon: IconKey;
}

export const products = {
    chatgpt: {
        id: "chatgpt",
        name: "ChatGPT",
        owner: "openai",
        icon: "openai",
    },
    claude: {
        id: "claude",
        name: "Claude",
        owner: "anthropic",
        icon: "claude",
    },
    gemini: {
        id: "gemini",
        name: "Gemini",
        owner: "google",
        icon: "gemini",
    },
} as const satisfies Record<ProductId, ProductDefinition>;