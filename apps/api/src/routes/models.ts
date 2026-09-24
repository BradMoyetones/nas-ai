import { Hono } from 'hono';
import { modelCatalog } from '../services/ai/providers';
import { hasProviderKey } from '../services/ai/provider-registry';
import { env } from '@/config/env';
import type { AppEnv } from '../app';

const modelsRouter = new Hono<AppEnv>();

modelsRouter.get('/', (c) => {
    return c.json({ categories: modelCatalog });
});

modelsRouter.get('/groq', async (c) => {
    if (!hasProviderKey('groq')) {
        return c.json({ message: 'GROQ_API_KEY not configured' }, 400);
    }

    const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        return c.json({ message: 'Error al obtener modelos de Groq' }, 400);
    }

    return c.json(await response.json());
});

modelsRouter.get('/openrouter', async (c) => {
    if (!hasProviderKey('openrouter')) {
        return c.json({ message: 'OPENROUTER_API_KEY not configured' }, 400);
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        return c.json({ message: 'Error al obtener modelos de OpenRouter' }, 400);
    }

    const data = await response.json();
    // Only return when id includes :free
    const filteredFreeModels = data.data.filter((model: { id: string }) => model.id.includes(':free'));

    return c.json(filteredFreeModels);
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

    // TODO: Use AI SDK provider to list models when supported
    return c.json({ message: 'Use the /api/models endpoint for the full catalog' });
});

export { modelsRouter };
