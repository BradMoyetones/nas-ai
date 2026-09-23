import type { FC, SVGProps } from "react";

export type IconComponent = FC<SVGProps<SVGSVGElement>>;

export type OrganizationId =
    | "openai"
    | "anthropic"
    | "google"
    | "meta"
    | "mistral"
    | "cohere"
    | "xai"
    | "stability"
    | "microsoft"
    | "deepseek"
    | "qwen";

export type ProviderId =
    | "openrouter"
    | "groq"
    | "cerebras"
    | "google";

export type ModelFamilyId =
    | "gpt"
    | "claude"
    | "gemini"
    | "llama"
    | "grok"
    | "deepseek"
    | "qwen"
    | "whisper"
    | "phi";

export type ProductId =
    | "chatgpt"
    | "claude"
    | "gemini";

export interface ModelIconContext {
    id: string;
    provider: ProviderId;

    owner?: OrganizationId;
    family?: ModelFamilyId;
    product?: ProductId;
}

export type IconSource =
    | "family"
    | "product"
    | "organization"
    | "provider"
    | "fallback";

export interface ResolvedIcon {
    component: IconComponent;
    key: string;
    source: IconSource;
}