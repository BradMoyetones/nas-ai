import type { AIProviderId } from '@nas/shared';

export interface ProviderNetworkConfig {
    /** URL base inyectada en los SDKs (ej: en createOpenAICompatible) */
    baseUrl: string;
    /** URL completa para el endpoint REST de modelos (usado en Transformers) */
    modelsUrl?: string;
}

/**
 * Fuente única de verdad para las URLs de los proveedores.
 * Usa getters para que `modelsUrl` se derive automáticamente de `baseUrl`.
 */
export const PROVIDER_ENDPOINTS: Record<AIProviderId, ProviderNetworkConfig> = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        get modelsUrl() { return `${this.baseUrl}/models`; }
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        get modelsUrl() { return `${this.baseUrl}/models`; }
    },
    cerebras: {
        baseUrl: 'https://api.cerebras.ai/v1',
        get modelsUrl() { return `${this.baseUrl}/models`; }
    },
    google: {
        // El SDK oficial de Google maneja sus propias URLs, 
        // documentamos la base actual como referencia.
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    }
};
