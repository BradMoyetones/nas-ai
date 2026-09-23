import { Router } from 'express';
import { modelCatalog } from '../services/ai/providers';
import { hasGroqKey } from '@/services/ai/groq';
import { hasOpenRouterKey } from '@/services/ai/openrouter';
import { hasCerebrasKey } from '@/services/ai/cerebras';
import { ai, hasGoogleKey } from '@/services/ai/google';
import { env } from '@/config/env';

const router = Router();

router.get('/', (req, res) => {
    res.status(200).json({ categories: modelCatalog });
});

router.get('/groq', async (req, res) => {
    if (!hasGroqKey()) {
        res.status(400).json({ message: 'GROQ_API_KEY not configured' });
        return;
    }

    const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        res.status(400).json({ message: 'Error al obtener modelos de Groq' });
        return;
    }

    res.status(200).json(await response.json());
});

router.get('/openrouter', async (req, res) => {
    if (!hasOpenRouterKey()) {
        res.status(400).json({ message: 'OPENROUTER_API_KEY not configured' });
        return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        res.status(400).json({ message: 'Error al obtener modelos de OpenRouter' });
        return;
    }

    const data = await response.json();
    // Only return when id includes :free
    const filteredFreeModels = data.data.filter((model: { id: string }) => model.id.includes(':free'));

    res.status(200).json(filteredFreeModels);
});

router.get('/cerebras', (req, res) => {
    if (!hasCerebrasKey()) {
        res.status(400).json({ message: 'CEREBRAS_API_KEY not configured' });
        return;
    }
    res.status(200).json({ ok: false });
});

router.get('/google', async (req, res) => {
    if (!hasGoogleKey()) {
        res.status(400).json({ message: 'GEMINI_API_KEY not configured' });
        return;
    }

    const models = await ai.models.list();
    res.status(200).json(models);
});

export { router as modelsRouter };
