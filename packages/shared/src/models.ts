import type { AIProviderId } from './providers';

/**
 * Capacidades de un modelo de IA.
 */
export interface ModelCapabilities {
    textInput: boolean;
    imageInput: boolean;
    reasoning: boolean;
    tools: boolean;
    streaming: boolean;
    structuredOutput: boolean;
    contextWindow?: number;
    maxOutputTokens?: number;
}

/**
 * Representación de un modelo de IA en el catálogo.
 */
export interface AIModel {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    provider: AIProviderId;
    capabilities?: ModelCapabilities;
}

/**
 * Agrupación de modelos por categoría de proveedor.
 */
export interface AICategory {
    category: string;
    models: AIModel[];
}
