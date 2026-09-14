import { env } from '../../config/env';
import type { AIModel } from './providers';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export type ProviderStreamChunk = {
    content?: string;
    reasoningTokens?: number;
};

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

function decodeSseLine(rawLine: string): unknown | null {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) return null;

    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return null;

    try {
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

export function hasOpenRouterKey(): boolean {
    return env.OPENROUTER_API_KEY.trim().length > 0;
}

export async function streamFromOpenRouter(params: {
    messages: ChatMessage[];
    model: AIModel;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
    if (!hasOpenRouterKey()) {
        throw new Error('OPENROUTER_API_KEY no configurada');
    }

    const response = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'NAS AI API',
        },
        body: JSON.stringify({
            model: params.model.id,
            messages: params.messages,
            stream: true,
        }),
    });

    if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${errorText}`);
    }

    // En Node.js, fetch response.body es un ReadableStream
    // Necesitamos convertirlo a async iterable
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    async function* iterate(): AsyncGenerator<ProviderStreamChunk> {
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                const event = decodeSseLine(line) as any;
                if (!event) continue;

                const content = event.choices?.[0]?.delta?.content;
                const reasoningTokens =
                    event.usage?.completion_tokens_details?.reasoning_tokens ??
                    event.usage?.completionTokensDetails?.reasoningTokens;

                if (content) {
                    yield { content };
                }

                if (typeof reasoningTokens === 'number') {
                    yield { reasoningTokens };
                }
            }
        }
    }

    return iterate();
}
