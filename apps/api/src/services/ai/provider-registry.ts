/**
 * ProviderRegistry — Registro centralizado de proveedores AI SDK.
 *
 * Resuelve un AIProviderId + modelId → instancia de modelo del AI SDK.
 * Eliminó la necesidad de 4 archivos de proveedor manual (~1,800 líneas).
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { AIProviderId } from '@nas/shared';
import type { LanguageModel } from 'ai';
import { env } from '../../config/env';

// ─── Instancias de proveedor ─────────────────────────────────────────────────

/**
 * Cada proveedor se crea lazily la primera vez que se necesita.
 * Esto evita errores si una API key no está configurada pero
 * el proveedor no se usa.
 */

function createGroqProvider() {
    return createOpenAICompatible({
        name: 'groq',
        apiKey: env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
    });
}

function createOpenRouterProvider() {
    return createOpenAICompatible({
        name: 'openrouter',
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
    });
}

function createCerebrasProvider() {
    return createOpenAICompatible({
        name: 'cerebras',
        apiKey: env.CEREBRAS_API_KEY,
        baseURL: 'https://api.cerebras.ai/v1',
    });
}

function createGoogleProvider() {
    return createGoogleGenerativeAI({
        apiKey: env.GEMINI_API_KEY,
    });
}

// ─── Cache de instancias ─────────────────────────────────────────────────────

let groq: ReturnType<typeof createOpenAICompatible> | null = null;
let openrouter: ReturnType<typeof createOpenAICompatible> | null = null;
let cerebras: ReturnType<typeof createOpenAICompatible> | null = null;
let google: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getGroq() {
    if (!groq) groq = createGroqProvider();
    return groq;
}

function getOpenRouter() {
    if (!openrouter) openrouter = createOpenRouterProvider();
    return openrouter;
}

function getCerebras() {
    if (!cerebras) cerebras = createCerebrasProvider();
    return cerebras;
}

function getGoogle() {
    if (!google) google = createGoogleProvider();
    return google;
}

// ─── Resolución de modelo ────────────────────────────────────────────────────

/**
 * Dado un providerId y un modelId, devuelve una instancia de
 * LanguageModelV1 del AI SDK lista para usar con streamText().
 *
 * @example
 * const model = resolveModel('groq', 'llama-3.1-8b-instant');
 * const result = streamText({ model, messages });
 */
export function resolveModel(
    provider: AIProviderId,
    modelId: string,
): LanguageModel {
    switch (provider) {
        case 'groq':
            return getGroq()(modelId);

        case 'openrouter':
            return getOpenRouter()(modelId);

        case 'cerebras':
            return getCerebras()(modelId);

        case 'google':
            return getGoogle()(modelId);

        default: {
            const _exhaustive: never = provider;
            throw new Error(`Proveedor no soportado: ${_exhaustive}`);
        }
    }
}

// ─── Utilidades de verificación ──────────────────────────────────────────────

export function hasProviderKey(provider: AIProviderId): boolean {
    switch (provider) {
        case 'groq':
            return !!env.GROQ_API_KEY;
        case 'openrouter':
            return !!env.OPENROUTER_API_KEY;
        case 'cerebras':
            return !!env.CEREBRAS_API_KEY;
        case 'google':
            return !!env.GEMINI_API_KEY;
        default:
            return false;
    }
}
