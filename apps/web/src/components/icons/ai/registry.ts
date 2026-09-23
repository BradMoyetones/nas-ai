import type { IconComponent } from "./types";

// Organizations
import { OpenAI } from "../openai";
import { Anthropic } from "../anthropic";
import { Google } from "../google";
import { Meta } from "../meta";
import { MistralAI } from "../mistralai";
import { Cohere } from "../cohere";
import { xAI } from "../xai";
import { StabilityAI } from "../stabilityai";
import { Microsoft } from "../microsoft";

// Providers
import { Groq } from "../groq";
import { OpenRouter } from "../openrouter";
import { Cerebras } from "../cerebras";
import { TogetherAI } from "../togetherai";
import { HuggingFace } from "../huggingface";
import { Replicate } from "../replicate";
import { Ollama } from "../ollama";

// Model families / products
import { ClaudeAI } from "../claudeai";
import { Gemini } from "../gemini";
import { Grok } from "../grok";
import { DeepSeek } from "../deepseek";
import { Qwen } from "../qwen";

export const iconRegistry = {

    // Organizations
    openai: OpenAI,
    anthropic: Anthropic,
    google: Google,
    meta: Meta,
    mistral: MistralAI,
    cohere: Cohere,
    xai: xAI,
    stability: StabilityAI,
    microsoft: Microsoft,

    // Providers
    openrouter: OpenRouter,
    groq: Groq,
    cerebras: Cerebras,
    together: TogetherAI,
    huggingface: HuggingFace,
    replicate: Replicate,
    ollama: Ollama,

    // Model families / products
    claude: ClaudeAI,
    gemini: Gemini,
    grok: Grok,
    deepseek: DeepSeek,
    qwen: Qwen,

} as const satisfies Record<string, IconComponent>;

export type IconKey = keyof typeof iconRegistry;