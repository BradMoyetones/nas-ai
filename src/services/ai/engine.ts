import type {
    ChatMessage,
    ProviderStreamChunk,
} from './types';

import type { AIModel } from './providers';

import { streamFromOpenRouter } from './openrouter';
import { streamFromGroq } from './groq';
import { streamFromCerebras } from './cerebras';
import { streamFromGoogle } from './google';

function assertNever(
    provider: never
): never {
    throw new Error(
        `Provider no soportado: ${provider}`
    );
}

export async function streamFromProvider(
    params: {
        messages: ChatMessage[];
        model: AIModel;
        signal?: AbortSignal;
    }
): Promise<
    AsyncGenerator<ProviderStreamChunk>
> {
    const provider =
        params.model.provider;

    switch (provider) {
        case 'openrouter':
            return streamFromOpenRouter(
                params
            );

        case 'groq':
            return streamFromGroq(
                params
            );

        case 'cerebras':
            return streamFromCerebras(
                params
            );

        case 'google':
            return streamFromGoogle(
                params
            );

        default:
            return assertNever(
                provider
            );
    }
}