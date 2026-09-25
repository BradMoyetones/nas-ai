/**
 * ProviderRegistry — Registro centralizado de proveedores AI SDK.
 *
 * Resuelve un AIProviderId + modelId → instancia de modelo del AI SDK.
 *
 * Soporta dos fuentes de credenciales:
 * 1. Credencial del usuario (cifrada en DB) — prioridad
 * 2. Credencial del servidor (.env) — fallback
 */

// Providers
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createCerebras } from '@ai-sdk/cerebras';
import { createGroq } from '@ai-sdk/groq';

import type { AIProviderId } from '@nas/shared';
import type { LanguageModel } from 'ai';
import { env } from '../../config/env';
import { PROVIDER_ENDPOINTS } from '../../config/providers';

// ─── Configuración de proveedores ────────────────────────────────────────────

interface ProviderConfig {
    name: string;
    envKey: string;
    factory: 'openai-compatible' | 'google' | 'groq' | 'openrouter' | 'cerebras';
    baseURL?: string;
}

const PROVIDER_CONFIGS: Record<AIProviderId, ProviderConfig> = {
    groq: {
        name: 'groq',
        envKey: 'GROQ_API_KEY',
        factory: 'groq',
        baseURL: PROVIDER_ENDPOINTS.groq.baseUrl,
    },
    openrouter: {
        name: 'openrouter',
        envKey: 'OPENROUTER_API_KEY',
        factory: 'openrouter',
        baseURL: PROVIDER_ENDPOINTS.openrouter.baseUrl,
    },
    cerebras: {
        name: 'cerebras',
        envKey: 'CEREBRAS_API_KEY',
        factory: 'cerebras',
        baseURL: PROVIDER_ENDPOINTS.cerebras.baseUrl,
    },
    google: {
        name: 'google',
        envKey: 'GEMINI_API_KEY',
        factory: 'google',
    },
};

// ─── Cache de instancias (por API key) ───────────────────────────────────────

const providerCache = new Map<
    string,
    ReturnType<typeof createOpenAICompatible> |
    ReturnType<typeof createOpenRouter> |
    ReturnType<typeof createGoogleGenerativeAI> |
    ReturnType<typeof createGroq> |
    ReturnType<typeof createCerebras>
>();

function getOrCreateProvider(
    config: ProviderConfig,
    apiKey: string,
) {
    const cacheKey = `${config.name}:${apiKey.slice(0, 8)}`;

    let provider = providerCache.get(cacheKey);
    if (provider) return provider;

    switch (config.factory) {
        case 'google':
            provider = createGoogleGenerativeAI({
                apiKey,
            });
            break;
        case 'groq':
            provider = createGroq({
                apiKey,
                baseURL: config.baseURL,
            });
            break;
        case 'openrouter':
            provider = createOpenRouter({
                apiKey,
                baseURL: config.baseURL,
            });
            break;
        case 'cerebras':
            provider = createCerebras({
                apiKey,
                baseURL: config.baseURL,
            });
            break;
        default:
            provider = createOpenAICompatible({
                name: config.name,
                apiKey,
                baseURL: config.baseURL!,
            });
    }

    providerCache.set(cacheKey, provider);
    return provider;
}

// ─── Resolución de API key ───────────────────────────────────────────────────

export function getServerApiKey(provider: AIProviderId): string {
    switch (provider) {
        case 'groq':
            return env.GROQ_API_KEY;
        case 'openrouter':
            return env.OPENROUTER_API_KEY;
        case 'cerebras':
            return env.CEREBRAS_API_KEY;
        case 'google':
            return env.GEMINI_API_KEY;
        default: {
            const _exhaustive: never = provider;
            throw new Error(`Unknown provider: ${_exhaustive}`);
        }
    }
}

// ─── API Pública ─────────────────────────────────────────────────────────────

/**
 * Resuelve un modelo del AI SDK usando la API key del servidor.
 * Para uso simple sin credenciales de usuario.
 */
export function resolveModel(
    provider: AIProviderId,
    modelId: string,
): LanguageModel {
    const apiKey = getServerApiKey(provider);
    if (!apiKey) {
        throw new Error(`No API key configured for provider: ${provider}`);
    }

    const config = PROVIDER_CONFIGS[provider];
    const providerInstance = getOrCreateProvider(config, apiKey);
    return providerInstance(modelId);
}

/**
 * Resuelve un modelo del AI SDK con resolución de credenciales:
 * 1. Si userApiKey es proporcionado → usar esa
 * 2. Si no → usar la clave del servidor
 *
 * @param provider - ID del proveedor
 * @param modelId - ID del modelo
 * @param userApiKey - API key del usuario (opcional, ya descifrada)
 */
export function resolveModelWithCredentials(
    provider: AIProviderId,
    modelId: string,
    userApiKey?: string | null,
): LanguageModel {
    const apiKey = userApiKey || getServerApiKey(provider);

    if (!apiKey) {
        throw new Error(
            `No API key available for provider "${provider}". ` +
            `Configure a server key or add your own in Settings.`
        );
    }

    const config = PROVIDER_CONFIGS[provider];
    const providerInstance = getOrCreateProvider(config, apiKey);
    return providerInstance(modelId);
}

/**
 * Verifica si hay una API key del servidor para un proveedor.
 */
export function hasProviderKey(provider: AIProviderId): boolean {
    return !!getServerApiKey(provider);
}
