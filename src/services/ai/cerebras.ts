import { env } from '../../config/env';
import type { AIModel } from './providers';
import type { ChatMessage, ProviderStreamChunk } from './types';

const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1/chat/completions';

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

export function hasCerebrasKey(): boolean {
    return env.CEREBRAS_API_KEY.trim().length > 0;
}

export async function streamFromCerebras(params: {
    messages: ChatMessage[];
    model: AIModel;
    signal?: AbortSignal;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
    if (!hasCerebrasKey()) {
        throw new Error('CEREBRAS_API_KEY no configurada');
    }

    const response = await fetch(CEREBRAS_BASE_URL, {
        method: 'POST',
        signal: params.signal,
        headers: {
            Authorization: `Bearer ${env.CEREBRAS_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: params.model.id,
            messages: params.messages,
            stream: true,
        }),
    });

    if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`Cerebras ${response.status}: ${errorText}`);
    }

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

                if (content) {
                    yield { content };
                }
            }
        }
    }

    return iterate();
}
