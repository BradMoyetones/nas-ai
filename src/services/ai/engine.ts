import type { ProviderStreamChunk, ChatMessage } from './types';
import type { AIModel } from './providers';
import { streamFromOpenRouter } from './openrouter';
import { streamFromGroq } from './groq';
import { streamFromCerebras } from './cerebras';
import { streamFromGoogle } from './google';

export async function streamFromProvider(params: {
  messages: ChatMessage[];
  model: AIModel;
  signal?: AbortSignal;
}): Promise<AsyncGenerator<ProviderStreamChunk>> {
  switch (params.model.provider) {
    case 'openrouter': return streamFromOpenRouter(params);
    case 'groq': return streamFromGroq(params);
    case 'cerebras': return streamFromCerebras(params);
    case 'google': return streamFromGoogle(params);
    default: throw new Error(`Provider no soportado: ${params.model.provider}`);
  }
}
