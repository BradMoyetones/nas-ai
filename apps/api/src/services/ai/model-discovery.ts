/**
 * ModelDiscoveryService — Catálogo de modelos y descubrimiento dinámico.
 *
 * Utiliza transformadores específicos por proveedor para estandarizar
 * la metadata de los modelos (capacidades, modalidades, pricing).
 */

import type { AIModel, AICategory, AIProviderId } from '@nas/shared';
import { getServerApiKey } from './provider-registry';
import { credentialService } from '../credential.service';

// Transformadores
import { fetchOpenRouterModels } from './transformers/openrouter';
import { fetchGroqModels } from './transformers/groq';
import { fetchGoogleModels } from './transformers/google';

type TransformerFn = (apiKey: string) => Promise<AIModel[]>;

const TRANSFORMERS: Partial<Record<AIProviderId, TransformerFn>> = {
    openrouter: fetchOpenRouterModels,
    groq: fetchGroqModels,
    google: fetchGoogleModels,
    // cerebras eliminado por ahora por requerir pago
};

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry {
    models: AIModel[];
    timestamp: number;
}
const TTL_MS = 5 * 60 * 1000; // 5 minutos
const modelCache = new Map<string, CacheEntry>();

// ─── Lógica principal ────────────────────────────────────────────────────────

/**
 * Resuelve la API key para un proveedor.
 * 1. Clave del usuario (si userId está presente)
 * 2. Clave del servidor (.env)
 */
async function resolveDiscoveryKey(provider: AIProviderId, userId?: string): Promise<string | null> {
    if (userId) {
        const userKey = await credentialService.resolveApiKey(userId, provider);
        if (userKey) return userKey;
    }
    // No exportamos getServerApiKey en provider-registry, pero podemos simular
    // o exportar. Asumiendo que ahora lo exportaremos o podemos leer del env.
    // Lo importamos arriba.
    return getServerApiKey(provider) || null;
}

/**
 * Obtiene la lista estandarizada de modelos para un proveedor específico.
 */
export async function getProviderModels(provider: AIProviderId, userId?: string): Promise<AIModel[]> {
    const transformFn = TRANSFORMERS[provider];
    if (!transformFn) {
        return [];
    }

    const apiKey = await resolveDiscoveryKey(provider, userId);
    if (!apiKey) {
        return [];
    }

    // Cache key basada en provider + (últimos 8 chars de la API key para seguridad y unicidad)
    const cacheKey = `${provider}:${apiKey.slice(-8)}`;
    const cached = modelCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < TTL_MS) {
        return cached.models;
    }

    try {
        const models = await transformFn(apiKey);
        
        // Ordenar alfabéticamente
        models.sort((a, b) => a.name.localeCompare(b.name));
        
        modelCache.set(cacheKey, { models, timestamp: Date.now() });
        return models;
    } catch (error) {
        console.error(`[model-discovery] Error fetching models for ${provider}:`, error);
        return cached ? cached.models : []; // Retornar stale cache si falla
    }
}

/**
 * Obtiene el catálogo completo agrupado por categorías,
 * consultando todos los proveedores configurados en paralelo.
 */
export async function getModelCatalog(userId?: string): Promise<AICategory[]> {
    const providers: AIProviderId[] = ['groq', 'openrouter', 'google'];
    
    const results = await Promise.allSettled(
        providers.map(async (provider) => {
            const models = await getProviderModels(provider, userId);
            return { provider, models };
        })
    );
    
    const categories: AICategory[] = [];
    
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.models.length > 0) {
            const { provider, models } = result.value;
            
            const categoryName = {
                groq: 'Groq',
                openrouter: 'OpenRouter',
                google: 'Google',
                cerebras: 'Cerebras'
            }[provider] || provider;
            
            categories.push({
                category: categoryName,
                models,
            });
        }
    }
    
    return categories;
}

/**
 * Busca un modelo por ID en el catálogo completo.
 */
export async function findModel(modelId: string, userId?: string): Promise<AIModel | undefined> {
    const categories = await getModelCatalog(userId);
    for (const cat of categories) {
        const found = cat.models.find(m => m.id === modelId);
        if (found) return found;
    }
    return undefined;
}

/**
 * Invalida el caché.
 */
export function invalidateModelCatalog(): void {
    modelCache.clear();
}
