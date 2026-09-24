/**
 * ModelDiscoveryService — Catálogo de modelos con capacidades curadas.
 *
 * Fase actual: Catálogo estático con metadatos de capacidades.
 * Fase futura: Descubrimiento dinámico vía APIs de proveedores + caché.
 *
 * Los modelos Whisper (transcripción de audio) se excluyen del catálogo
 * de chat porque son endpoints completamente diferentes.
 */

import type { AIModel, AICategory, ModelCapabilities } from '@nas/shared';
import { hasProviderKey } from './provider-registry';

// ─── Capacidades curadas por modelo ─────────────────────────────────────────

/**
 * Base de datos de capacidades conocidas.
 * Complementa los datos de la API del proveedor con información
 * que no siempre está disponible en los endpoints de listado.
 */
const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
    // ── Groq ──
    'openai/gpt-oss-120b': {
        textInput: true,
        imageInput: false,
        reasoning: false,
        tools: true,
        streaming: true,
        structuredOutput: true,
        contextWindow: 131072,
    },
    'openai/gpt-oss-20b': {
        textInput: true,
        imageInput: false,
        reasoning: false,
        tools: true,
        streaming: true,
        structuredOutput: true,
        contextWindow: 131072,
    },

    // ── OpenRouter ──
    'openrouter/auto': {
        textInput: true,
        imageInput: false,
        reasoning: false,
        tools: false,
        streaming: true,
        structuredOutput: false,
    },
    'nvidia/nemotron-3.5-lightning:free': {
        textInput: true,
        imageInput: false,
        reasoning: false,
        tools: false,
        streaming: true,
        structuredOutput: false,
        contextWindow: 32768,
    },
    'nex-agi/nex-n2.5-pro:free': {
        textInput: true,
        imageInput: false,
        reasoning: true,
        tools: false,
        streaming: true,
        structuredOutput: false,
    },

    // ── Cerebras ──
    'qwen-3.8-27b': {
        textInput: true,
        imageInput: false,
        reasoning: false,
        tools: false,
        streaming: true,
        structuredOutput: false,
        contextWindow: 8192,
    },
    'gpt-oss-120b': {
        textInput: true,
        imageInput: false,
        reasoning: false,
        tools: false,
        streaming: true,
        structuredOutput: false,
    },

    // ── Google ──
    'gemini-3.8-flash': {
        textInput: true,
        imageInput: true,
        reasoning: true,
        tools: true,
        streaming: true,
        structuredOutput: true,
        contextWindow: 1048576,
        maxOutputTokens: 65536,
    },
    'gemini-3.8-live-extended-thinking': {
        textInput: true,
        imageInput: true,
        reasoning: true,
        tools: true,
        streaming: true,
        structuredOutput: true,
        contextWindow: 1048576,
    },
    'gemini-3.5-flash': {
        textInput: true,
        imageInput: true,
        reasoning: true,
        tools: true,
        streaming: true,
        structuredOutput: true,
        contextWindow: 1048576,
        maxOutputTokens: 65536,
    },
    'gemini-3.5-flash-lite': {
        textInput: true,
        imageInput: true,
        reasoning: false,
        tools: false,
        streaming: true,
        structuredOutput: true,
        contextWindow: 1048576,
    },
    'gemini-3.1-pro-preview': {
        textInput: true,
        imageInput: true,
        reasoning: true,
        tools: true,
        streaming: true,
        structuredOutput: true,
        contextWindow: 2097152,
        maxOutputTokens: 65536,
    },
};

// ─── Catálogo de modelos ─────────────────────────────────────────────────────

/**
 * Catálogo completo con capabilities enriquecidas.
 * Excluye modelos Whisper y modelos deshabilitados.
 */
function buildModelCatalog(): AICategory[] {
    const catalog: AICategory[] = [
        {
            category: 'Groq (Ultra-Fast)',
            models: [
                {
                    id: 'openai/gpt-oss-120b',
                    name: 'GPT OSS 120B',
                    description: 'Modelo masivo Open Source optimizado para velocidad',
                    icon: 'Zap',
                    provider: 'groq',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['openai/gpt-oss-120b'],
                },
                {
                    id: 'openai/gpt-oss-20b',
                    name: 'GPT OSS 20B',
                    description: 'Modelo Open Source optimizado para velocidad',
                    icon: 'Brain',
                    provider: 'groq',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['openai/gpt-oss-20b'],
                },
            ],
        },
        {
            category: 'Cerebras (Lightning)',
            models: [
                {
                    id: 'qwen-3.8-27b',
                    name: 'Qwen 3.8 27B',
                    description: 'Poder de 27B parámetros con chips Cerebras',
                    icon: 'Cpu',
                    provider: 'cerebras',
                    enabled: false,
                    capabilities: MODEL_CAPABILITIES['qwen-3.8-27b'],
                },
                {
                    id: 'gpt-oss-120b',
                    name: 'GPT OSS 120B',
                    description: 'Modelo masivo Open Source en hardware Cerebras',
                    icon: 'Cpu',
                    provider: 'cerebras',
                    enabled: false,
                    capabilities: MODEL_CAPABILITIES['gpt-oss-120b'],
                },
            ],
        },
        {
            category: 'OpenRouter (Multi-Provider)',
            models: [
                {
                    id: 'openrouter/auto',
                    name: 'Auto (Free)',
                    description: 'Selección automática del mejor modelo gratuito',
                    icon: 'Wand2',
                    provider: 'openrouter',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['openrouter/auto'],
                },
                {
                    id: 'nvidia/nemotron-3.5-lightning:free',
                    name: 'Nemotron 3.5 Lightning',
                    description: 'Modelo eficiente y gratuito de Nvidia',
                    icon: 'Search',
                    provider: 'openrouter',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['nvidia/nemotron-3.5-lightning:free'],
                },
                {
                    id: 'nex-agi/nex-n2.5-pro:free',
                    name: 'NEX 2.5 Pro',
                    description: 'Alto razonamiento de NEX AGI capa gratuita',
                    icon: 'Sparkles',
                    provider: 'openrouter',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['nex-agi/nex-n2.5-pro:free'],
                },
            ],
        },
        {
            category: 'Google AI',
            models: [
                {
                    id: 'gemini-3.8-flash',
                    name: 'Gemini 3.8 Flash',
                    description: 'Modelo rápido y eficiente para tareas complejas y agentes autónomos',
                    icon: 'Gem',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.8-flash'],
                },
                {
                    id: 'gemini-3.8-live-extended-thinking',
                    name: 'Gemini 3.8 Live Extended Thinking',
                    description: 'Razonamiento complejo y planificación multi-paso en tiempo real',
                    icon: 'Gem',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.8-live-extended-thinking'],
                },
                {
                    id: 'gemini-3.5-flash',
                    name: 'Gemini 3.5 Flash',
                    description: 'Inteligencia de frontera optimizada para tareas del mundo real',
                    icon: 'Gem',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.5-flash'],
                },
                {
                    id: 'gemini-3.5-flash-lite',
                    name: 'Gemini 3.5 Flash Lite',
                    description: 'Baja latencia, bajo costo para tareas de alto volumen',
                    icon: 'Gem',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.5-flash-lite'],
                },
                {
                    id: 'gemini-3.1-pro-preview',
                    name: 'Gemini 3.1 Pro Preview',
                    description: 'Mejor pensamiento y eficiencia de tokens para ingeniería de software',
                    icon: 'Gem',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.1-pro-preview'],
                },
            ],
        },
    ];

    // Filtrar categorías sin clave de API configurada
    return catalog.map(category => ({
        ...category,
        models: category.models.map(model => ({
            ...model,
            // Marcar como deshabilitado si no hay API key del proveedor
            enabled: model.enabled && hasProviderKey(model.provider),
        })),
    }));
}

// ─── API Pública ─────────────────────────────────────────────────────────────

let cachedCatalog: AICategory[] | null = null;

/**
 * Retorna el catálogo de modelos completo con capacidades.
 * Usa caché en memoria (se invalida al reiniciar el servidor).
 */
export function getModelCatalog(): AICategory[] {
    if (!cachedCatalog) {
        cachedCatalog = buildModelCatalog();
    }
    return cachedCatalog;
}

/**
 * Invalida el caché del catálogo.
 * Útil si las API keys cambian en runtime.
 */
export function invalidateModelCatalog(): void {
    cachedCatalog = null;
}

/**
 * Busca un modelo por ID en el catálogo.
 */
export function getModelById(id: string): AIModel | undefined {
    for (const category of getModelCatalog()) {
        const model = category.models.find((m) => m.id === id);
        if (model) return model;
    }
    return undefined;
}
