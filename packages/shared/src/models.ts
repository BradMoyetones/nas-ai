import type { AIProviderId } from './providers';

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface ModelPricing {
    /** Costo por token de input (en USD) */
    prompt: number;
    /** Costo por token de output (en USD) */
    completion: number;
}

// ─── Capabilities ────────────────────────────────────────────────────────────

export interface ModelCapabilities {
    textInput: boolean;
    imageInput: boolean;
    videoInput: boolean;
    audioInput: boolean;
    reasoning: boolean;
    tools: boolean;
    streaming: boolean;
    structuredOutput: boolean;
    contextWindow?: number;
    maxOutputTokens?: number;
}

// ─── Model ───────────────────────────────────────────────────────────────────

/**
 * Representación estandarizada de un modelo de IA.
 *
 * Todos los proveedores (Groq, OpenRouter, Google, etc.)
 * transforman su data nativa a esta interfaz.
 */
export interface AIModel {
    /** ID canónico del modelo (ej: "openai/gpt-oss-120b") */
    id: string;
    /** Nombre legible (ej: "GPT OSS 120B") */
    name: string;
    /** Descripción corta */
    description: string;
    /** Proveedor que sirve el modelo */
    provider: AIProviderId;
    /** Disponible para el usuario actual */
    enabled: boolean;
    /** Quién creó/entrenó el modelo (ej: "OpenAI", "Meta") */
    developer?: string;
    /** Pricing por token (puede no estar disponible) */
    pricing?: ModelPricing;
    /** Capabilities enriquecidas */
    capabilities: ModelCapabilities;
}

// ─── Category ────────────────────────────────────────────────────────────────

/**
 * Agrupación de modelos por categoría de proveedor.
 */
export interface AICategory {
    category: string;
    models: AIModel[];
}
