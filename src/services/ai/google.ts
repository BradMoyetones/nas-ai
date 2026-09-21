import { env } from "../../config/env";
import { GoogleGenAI } from "@google/genai";
import { AIModel } from "./providers";
import { ChatMessage, ProviderStreamChunk } from "./types";

export function hasGoogleKey(): boolean {
    return env.GEMINI_API_KEY.trim().length > 0;
}

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }); 

export async function streamFromGoogle(params: {
    messages: ChatMessage[];
    model: AIModel;
    signal?: AbortSignal;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
    if (!hasGoogleKey()) {
        throw new Error('GEMINI_API_KEY no configurada');
    }

    const systemMessage = params.messages.find(m => m.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    const contents = params.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user', // Google uses 'model' or 'user'
            parts: [{ text: msg.content }]
        }));

    const response = await ai.models.generateContentStream({
      model: params.model.id,
      contents: contents,
      config: {
          systemInstruction: systemInstruction,
          abortSignal: params.signal as any
      },
    });

    async function* iterate(): AsyncGenerator<ProviderStreamChunk> {
        for await (const chunk of response) {
            if (params.signal?.aborted) {
                throw new Error('AbortError');
            }
            if (chunk.text) {
                yield { content: chunk.text };
            }
        }
    }

    return iterate();
}