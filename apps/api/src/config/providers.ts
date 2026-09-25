import type { AIProviderId, AIProvider } from '@nas/shared';

/**
 * FUENTE ÚNICA DE VERDAD de todos los proveedores soportados en el ecosistema.
 */
export const PROVIDER_CONFIGS: Record<AIProviderId, AIProvider> = {
    groq: {
        id: 'groq',
        name: 'Groq',
        description: 'Inferencia ultra rápida con tecnología LPU, ideal para modelos Open Source.',
        envKey: 'GROQ_API_KEY',
        factory: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        get modelsUrl() { return `${this.baseUrl}/models`; },
        enableDiscovery: true,
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Acceso unificado a cientos de modelos premium y open source con precios competitivos.',
        envKey: 'OPENROUTER_API_KEY',
        factory: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        get modelsUrl() { return `${this.baseUrl}/models`; },
        enableDiscovery: true,
    },
    google: {
        id: 'google',
        name: 'Google AI',
        description: 'La familia de modelos Gemini, líderes en contexto multimodal masivo y razonamiento.',
        envKey: 'GEMINI_API_KEY',
        factory: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        // Google usa su SDK para discovery
        enableDiscovery: true,
    },
    cerebras: {
        id: 'cerebras',
        name: 'Cerebras',
        description: 'Aceleración por hardware masivo CS-3 para inferencia instantánea (Requiere pago).',
        envKey: 'CEREBRAS_API_KEY',
        factory: 'cerebras',
        baseUrl: 'https://api.cerebras.ai/v1',
        get modelsUrl() { return `${this.baseUrl}/models`; },
        enableDiscovery: false,
    }
};

/**
 * Array seguro de IDs de proveedores configurados
 */
export const SUPPORTED_PROVIDER_IDS = Object.keys(PROVIDER_CONFIGS) as AIProviderId[];
