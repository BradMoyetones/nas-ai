import { Hono } from 'hono';
import { getModelCatalog } from '../services/ai/model-discovery';
import { hasProviderKey } from '../services/ai/provider-registry';
import { env } from '@/config/env';
import type { AppEnv } from '../app';
import Groq from 'groq-sdk';
import { OpenRouter } from '@openrouter/sdk';
import {GoogleGenAI} from "@google/genai";

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const openrouter = new OpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
});
const google = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const modelsRouter = new Hono<AppEnv>();

/**
 * GET /api/models
 *
 * Retorna el catálogo completo de modelos con capacidades.
 * Los modelos sin API key configurada se marcan como disabled.
 */
modelsRouter.get('/', (c) => {
    return c.json({ categories: getModelCatalog() });
});

/**
 * GET /api/models/groq
 *
 * Lista modelos disponibles directamente de la API de Groq.
 * Útil para descubrimiento dinámico futuro.
 */
modelsRouter.get('/groq', async (c) => {
    if (!hasProviderKey('groq')) {
        return c.json({ message: 'GROQ_API_KEY not configured' }, 400);
    }

    const models = await groq.models.list();

    models.data.map(data => data.id)
    // const response = await fetch('https://api.groq.com/openai/v1/models', {
    //     method: 'GET',
    //     headers: {
    //         Authorization: `Bearer ${env.GROQ_API_KEY}`,
    //         'Content-Type': 'application/json',
    //     },
    // });

    // if (!response.ok) {
    //     return c.json({ message: 'Error al obtener modelos de Groq' }, 400);
    // }

    return c.json(models);
});

/**
 * GET /api/models/openrouter
 *
 * Lista modelos gratuitos de OpenRouter.
 */
modelsRouter.get('/openrouter', async (c) => {
    if (!hasProviderKey('openrouter')) {
        return c.json({ message: 'OPENROUTER_API_KEY not configured' }, 400);
    }
    const models = await openrouter.models.list({ offset: 0, limit: 100 });

    // const response = await fetch('https://openrouter.ai/api/v1/models', {
    //     method: 'GET',
    //     headers: {
    //         Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    //         'Content-Type': 'application/json',
    //     },
    // });

    // if (!response.ok) {
    //     return c.json({ message: 'Error al obtener modelos de OpenRouter' }, 400);
    // }

    // const data = await response.json();
    // const filteredFreeModels = data.data.filter((model: { id: string }) => model.id.includes(':free'));

    return c.json(models);
});

modelsRouter.get('/cerebras', (c) => {
    if (!hasProviderKey('cerebras')) {
        return c.json({ message: 'CEREBRAS_API_KEY not configured' }, 400);
    }
    return c.json({ ok: false });
});

modelsRouter.get('/google', async (c) => {
    if (!hasProviderKey('google')) {
        return c.json({ message: 'GEMINI_API_KEY not configured' }, 400);
    }
    const models = await google.models.list();
    return c.json(models);
});

export { modelsRouter };
