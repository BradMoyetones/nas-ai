/**
 * Transformer: OpenRouter → AIModel[]
 *
 * Usa el tipo `Model` del SDK @openrouter/sdk que incluye
 * architecture, pricing, reasoning, supportedParameters, etc.
 */

import { OpenRouter } from '@openrouter/sdk';
import type { Model } from '@openrouter/sdk/models/model';
import type { AIModel } from '@nas/shared';
import { PROVIDER_CONFIGS } from '../../../config/providers';

/** Modelos excluidos (TTS, embeddings, etc) */
const EXCLUDED_PATTERNS = ['tts', 'embedding', 'moderation', 'dall-e', 'whisper'];

function isExcluded(id: string): boolean {
    const lower = id.toLowerCase();
    return EXCLUDED_PATTERNS.some(p => lower.includes(p));
}

function transformModel(m: Model): AIModel {
    const arch = m.architecture;
    const inputs = arch?.inputModalities ?? [];
    const params = m.supportedParameters ?? [];

    // Extraer developer del slug "developer/model-name"
    const developer = m.id.includes('/')
        ? m.id.split('/')[0]
        : undefined;

    return {
        id: m.id,
        name: m.name,
        description: m.description ?? '',
        provider: 'openrouter',
        enabled: true,
        developer,
        pricing: m.pricing
            ? {
                  prompt: parseFloat(String(m.pricing.prompt ?? '0')),
                  completion: parseFloat(String(m.pricing.completion ?? '0')),
              }
            : undefined,
        capabilities: {
            textInput: inputs.includes('text'),
            imageInput: inputs.includes('image'),
            videoInput: inputs.includes('video'),
            audioInput: inputs.includes('audio'),
            reasoning: !!m.reasoning || params.includes('reasoning'),
            tools: params.includes('tools'),
            streaming: true,
            structuredOutput: params.includes('structured_outputs'),
            contextWindow: m.contextLength ?? undefined,
            maxOutputTokens: m.topProvider?.maxCompletionTokens ?? undefined,
        },
    };
}

export async function fetchOpenRouterModels(apiKey: string): Promise<AIModel[]> {
    const url = PROVIDER_CONFIGS.openrouter.modelsUrl;
    if (!url) throw new Error('modelsUrl not configured for openrouter');

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const json = await response.json() as { data: Model[] };
    const models = json.data ?? [];

    return models
        .filter(m => !isExcluded(m.id))
        .map(transformModel);
}
