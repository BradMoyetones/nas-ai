/**
 * Transformer: Groq → AIModel[]
 *
 * El tipo `Groq.Models.Model` del SDK solo tiene id, created, object, owned_by.
 * Pero la API real de Groq devuelve campos extendidos como:
 * - context_window, max_completion_tokens
 * - input_modalities, output_modalities
 * - supported_features (tools, json_mode, structured_outputs, reasoning)
 * - pricing { prompt, completion }
 * - name
 *
 * Hacemos fetch directo para acceder a toda esa data.
 */

import type { AIModel } from '@nas/shared';
import { PROVIDER_ENDPOINTS } from '../../../config/providers';

/** Forma real que devuelve la API de Groq (no tipada por el SDK) */
interface GroqRawModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    active?: boolean;
    context_window?: number;
    max_completion_tokens?: number;
    name?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    pricing?: {
        prompt?: string;
        completion?: string;
    };
    supported_features?: string[];
}

/** Modelos excluidos (no de chat) */
const EXCLUDED_PATTERNS = ['whisper', 'tts', 'embedding', 'moderation', 'guard', 'distil'];

function isExcluded(id: string): boolean {
    const lower = id.toLowerCase();
    return EXCLUDED_PATTERNS.some(p => lower.includes(p));
}

function transformModel(m: GroqRawModel): AIModel {
    const inputs = m.input_modalities ?? ['text'];
    const features = m.supported_features ?? [];

    const developer = m.owned_by || (m.id.includes('/') ? m.id.split('/')[0] : undefined);

    return {
        id: m.id,
        name: m.name || formatId(m.id),
        description: developer ? `By ${developer}` : '',
        provider: 'groq',
        enabled: true,
        developer,
        pricing: m.pricing
            ? {
                  prompt: parseFloat(m.pricing.prompt ?? '0'),
                  completion: parseFloat(m.pricing.completion ?? '0'),
              }
            : undefined,
        capabilities: {
            textInput: inputs.includes('text'),
            imageInput: inputs.includes('image'),
            videoInput: inputs.includes('video'),
            audioInput: inputs.includes('audio'),
            reasoning: features.includes('reasoning'),
            tools: features.includes('tools'),
            streaming: true,
            structuredOutput: features.includes('structured_outputs') || features.includes('json_mode'),
            contextWindow: m.context_window,
            maxOutputTokens: m.max_completion_tokens,
        },
    };
}

function formatId(id: string): string {
    const name = id.split('/').pop() || id;
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

export async function fetchGroqModels(apiKey: string): Promise<AIModel[]> {
    const url = PROVIDER_ENDPOINTS.groq.modelsUrl;
    if (!url) throw new Error('modelsUrl not configured for groq');

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json() as { data: GroqRawModel[] };

    return (data.data ?? [])
        .filter(m => m.active !== false)
        .filter(m => !isExcluded(m.id))
        .map(transformModel);
}
