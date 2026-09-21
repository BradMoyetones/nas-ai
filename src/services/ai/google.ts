import { env } from "@/config/env";
import { GoogleGenAI } from "@google/genai";
import { AIModel } from "./providers";
import { ChatMessage, ProviderStreamChunk } from "./openrouter";

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

export function hasGoogleKey(): boolean {
    return env.GEMINI_API_KEY.trim().length > 0;
}

const ai = new GoogleGenAI(); 

export async function streamFromGoogle(params: {
    messages: ChatMessage[];
    model: AIModel;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
    if (!hasGoogleKey()) {
        throw new Error('GEMINI_API_KEY no configurada');
    }

    const response = await ai.models.generateContentStream({
      model: params.model.id,
      contents: params.messages,
    });

    async function* iterate(): AsyncGenerator<ProviderStreamChunk> {
        let buffer = '';

        while (true) {
            const { value, done } = await response.next();
            if (done) break;

            buffer += value?.text;
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