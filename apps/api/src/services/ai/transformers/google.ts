/**
 * Transformer: Google GenAI → AIModel[]
 *
 * Usa el tipo `Model` del SDK @google/genai que incluye:
 * - inputTokenLimit, outputTokenLimit
 * - supportedActions (generateContent, countTokens, etc)
 * - thinking (boolean)
 * - displayName, description
 *
 * Google no expone pricing ni modalidades de input explícitamente,
 * pero los modelos Gemini soportan imagen/video/audio por defecto.
 */

import { GoogleGenAI } from '@google/genai';
import type { Model as GoogleModel } from '@google/genai';
import type { AIModel } from '@nas/shared';

/** Modelos excluidos (embeddings, attribution, AQA, etc) */
const EXCLUDED_PATTERNS = [
    'embedding',
    'aqa',
    'attribution',
    'bisheng',
    'imagen',
    'veo',
    'lyria',
];

/** Modelos conocidos con soporte de visión */
const VISION_PATTERNS = ['gemini'];

/** Modelos conocidos con soporte de tools */
const TOOLS_PATTERNS = ['gemini-3', 'gemini-2.5-pro', 'gemini-2.5-flash'];

function isExcluded(name: string): boolean {
    const lower = name.toLowerCase();
    return EXCLUDED_PATTERNS.some(p => lower.includes(p));
}

function hasVision(id: string): boolean {
    const lower = id.toLowerCase();
    return VISION_PATTERNS.some(p => lower.includes(p));
}

function hasTools(id: string): boolean {
    const lower = id.toLowerCase();
    return TOOLS_PATTERNS.some(p => lower.includes(p));
}

/**
 * Extrae el ID limpio de "models/gemini-3.5-flash" → "gemini-3.5-flash"
 */
function cleanModelId(name: string): string {
    return name.replace(/^models\//, '');
}

function transformModel(m: GoogleModel): AIModel {
    const id = cleanModelId(m.name ?? '');
    const actions = m.supportedActions ?? [];

    return {
        id,
        name: m.displayName ?? id,
        description: m.description ?? '',
        provider: 'google',
        enabled: true,
        developer: 'Google',
        capabilities: {
            textInput: true,
            imageInput: hasVision(id),
            videoInput: hasVision(id),
            audioInput: hasVision(id),
            reasoning: m.thinking === true,
            tools: hasTools(id),
            streaming: actions.includes('generateContent'),
            structuredOutput: hasTools(id),
            contextWindow: m.inputTokenLimit,
            maxOutputTokens: m.outputTokenLimit,
        },
    };
}

export async function fetchGoogleModels(apiKey: string): Promise<AIModel[]> {
    const client = new GoogleGenAI({ apiKey });
    const pager = await client.models.list({ config: { pageSize: 100 } });

    const models: AIModel[] = [];

    for await (const model of pager) {
        const name = model.name ?? '';
        if (isExcluded(name)) continue;

        // Filtrar modelos tuneados
        if (model.tunedModelInfo && Object.keys(model.tunedModelInfo).length > 0) {
            // Si tiene info de tuning, verificar que no es un modelo base
            // Los modelos base tienen tunedModelInfo vacío {}
        }

        // Solo modelos que soporten generateContent (chat)
        const actions = model.supportedActions ?? [];
        if (!actions.includes('generateContent')) continue;

        models.push(transformModel(model));
    }

    return models;
}
