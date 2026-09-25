/**
 * ModelDiscoveryService — Catálogo de modelos con capacidades curadas.
 *
 * Fase actual: Catálogo estático con metadatos de capacidades.
 * Fase futura: Descubrimiento dinámico vía APIs de proveedores + caché.
 *
 * Los modelos Whisper (transcripción de audio) se excluyen del catálogo
 * de chat porque son endpoints completamente diferentes.
 */

import type { AIModel, AICategory, ModelCapabilities, AIProviderId } from '@nas/shared';
import { hasProviderKey } from './provider-registry';
import { env } from '../../config/env';

interface ProviderModelResponse {
    data: Array<{ id: string; owned_by?: string }>;
}

const PROVIDER_ENDPOINTS: Record<string, { url: string; keyFn: () => string }> = {
    groq: {
        url: 'https://api.groq.com/openai/v1/models',
        keyFn: () => env.GROQ_API_KEY,
    },
    openrouter: {
        url: 'https://openrouter.ai/api/v1/models',
        keyFn: () => env.OPENROUTER_API_KEY,
    },
    cerebras: {
        url: 'https://api.cerebras.ai/v1/models',
        keyFn: () => env.CEREBRAS_API_KEY,
    },
};

// Modelos excluidos (no son modelos de chat)
const EXCLUDED_MODEL_PATTERNS = [
    'whisper',
    'tts',
    'dall-e',
    'embedding',
    'moderation',
];

function isExcludedModel(id: string): boolean {
    const lower = id.toLowerCase();
    return EXCLUDED_MODEL_PATTERNS.some(p => lower.includes(p));
}

async function fetchProviderModels(providerId: string): Promise<Array<{ id: string; owned_by?: string }>> {
    const config = PROVIDER_ENDPOINTS[providerId];
    if (!config) return [];
    
    const apiKey = config.keyFn();
    if (!apiKey) return [];
    
    try {
        const response = await fetch(config.url, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) return [];
        
        const data = await response.json() as ProviderModelResponse;
        return (data.data || []).filter(m => !isExcludedModel(m.id));
    } catch {
        console.warn(`[model-discovery] Failed to fetch models from ${providerId}`);
        return [];
    }
}

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
            category: 'Groq',
            models: [
                {
                    id: 'openai/gpt-oss-120b',
                    name: 'GPT OSS 120B',
                    description: 'Modelo masivo Open Source optimizado para velocidad',
                    provider: 'groq',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['openai/gpt-oss-120b'],
                },
                {
                    id: 'openai/gpt-oss-20b',
                    name: 'GPT OSS 20B',
                    description: 'Modelo Open Source optimizado para velocidad',
                    provider: 'groq',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['openai/gpt-oss-20b'],
                },
            ],
        },
        {
            category: 'OpenRouter',
            models: [
                {
                    id: 'openrouter/auto',
                    name: 'Auto (Free)',
                    description: 'Selección automática del mejor modelo gratuito',
                    provider: 'openrouter',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['openrouter/auto'],
                },
                {
                    id: 'nvidia/nemotron-3.5-lightning:free',
                    name: 'Nemotron 3.5 Lightning',
                    description: 'Modelo eficiente y gratuito de Nvidia',
                    provider: 'openrouter',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['nvidia/nemotron-3.5-lightning:free'],
                },
            ],
        },
        {
            category: 'Google',
            models: [
                {
                    id: 'gemini-3.8-flash',
                    name: 'Gemini 3.8 Flash',
                    description: 'Modelo rápido y eficiente para tareas complejas y agentes autónomos',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.8-flash'],
                },
                {
                    id: 'gemini-3.8-live-extended-thinking',
                    name: 'Gemini 3.8 Live Extended Thinking',
                    description: 'Razonamiento complejo y planificación multi-paso en tiempo real',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.8-live-extended-thinking'],
                },
                {
                    id: 'gemini-3.5-flash',
                    name: 'Gemini 3.5 Flash',
                    description: 'Inteligencia de frontera optimizada para tareas del mundo real',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.5-flash'],
                },
                {
                    id: 'gemini-3.5-flash-lite',
                    name: 'Gemini 3.5 Flash Lite',
                    description: 'Baja latencia, bajo costo para tareas de alto volumen',
                    provider: 'google',
                    enabled: true,
                    capabilities: MODEL_CAPABILITIES['gemini-3.5-flash-lite'],
                },
                {
                    id: 'gemini-3.1-pro-preview',
                    name: 'Gemini 3.1 Pro Preview',
                    description: 'Mejor pensamiento y eficiencia de tokens para ingeniería de software',
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
let dynamicCatalog: AICategory[] | null = null;
let lastDynamicRefresh = 0;
let isRefreshing = false;
const DYNAMIC_TTL_MS = 5 * 60 * 1000; // 5 minutos

const DEFAULT_CAPABILITIES: ModelCapabilities = {
    textInput: true,
    imageInput: false,
    reasoning: false,
    tools: false,
    streaming: true,
    structuredOutput: false,
};

function formatModelName(id: string): string {
    // "meta-llama/llama-3-70b-instruct" -> "Llama 3 70B Instruct"
    const name = id.split('/').pop() || id;
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/:free$/i, ' (Free)');
}

async function buildDynamicCatalog(): Promise<AICategory[]> {
    const providerIds = Object.keys(PROVIDER_ENDPOINTS) as Array<string>;
    
    const results = await Promise.allSettled(
        providerIds.map(async (providerId) => ({
            providerId,
            models: await fetchProviderModels(providerId),
        }))
    );
    
    const categories: AICategory[] = [];
    
    for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { providerId, models } = result.value;
        
        if (models.length === 0) continue;
        
        const categoryName = ({
            groq: 'Groq',
            openrouter: 'OpenRouter',
            cerebras: 'Cerebras',
        } as Record<string, string>)[providerId] || providerId;
        
        categories.push({
            category: categoryName,
            models: models.map(m => ({
                id: m.id,
                name: formatModelName(m.id),
                description: m.owned_by ? `By ${m.owned_by}` : '',
                icon: 'Brain',
                provider: providerId as AIProviderId,
                enabled: true,
                capabilities: MODEL_CAPABILITIES[m.id] || DEFAULT_CAPABILITIES,
            })),
        });
    }
    
    // Google no tiene endpoint de modelos OpenAI-compatible,
    // mantener catálogo estático para Google
    const staticCatalog = buildModelCatalog();
    const googleCategory = staticCatalog.find(c => c.category === 'Google AI');
    if (googleCategory) categories.push(googleCategory);
    
    return categories;
}

async function refreshDynamicCatalog(): Promise<void> {
    // Solo un refresh a la vez
    if (isRefreshing) return;
    isRefreshing = true;
    
    try {
        dynamicCatalog = await buildDynamicCatalog();
        lastDynamicRefresh = Date.now();
    } finally {
        isRefreshing = false;
    }
}

/**
 * Retorna el catálogo de modelos completo con capacidades.
 * Usa caché en memoria (se invalida al reiniciar el servidor).
 */
export function getModelCatalog(): AICategory[] {
    // Siempre retornar algo inmediatamente
    if (dynamicCatalog && (Date.now() - lastDynamicRefresh < DYNAMIC_TTL_MS)) {
        return dynamicCatalog;
    }
    
    // Lanzar refresh en background
    refreshDynamicCatalog().catch(console.error);
    
    // Retornar lo que tengamos (dinámico expirado o estático)
    return dynamicCatalog || cachedCatalog || (cachedCatalog = buildModelCatalog());
}

/**
 * Invalida el caché del catálogo.
 * Útil si las API keys cambian en runtime.
 */
export function invalidateModelCatalog(): void {
    cachedCatalog = null;
    dynamicCatalog = null;
    lastDynamicRefresh = 0;
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
