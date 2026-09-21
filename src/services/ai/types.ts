export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ProviderStreamChunk = {
  content?: string;
  reasoningTokens?: number;
};

export type AIProviderId = 'openrouter' | 'groq' | 'cerebras' | 'google';

/** Discriminated union for all SSE events the backend sends to the frontend */
export type ChatStreamEvent =
  | { event: 'conversation.created'; data: { id: string; title: string } }
  | { event: 'conversation.title'; data: { id: string; title: string } }
  | { event: 'message.delta'; data: { content: string } }
  | { event: 'message.completed'; data: { messageId: string; model: string; provider: string; usage?: { reasoningTokens?: number } } }
  | { event: 'generation.done'; data: { elapsedMs: number; chunkCount: number } }
  | { event: 'error'; data: { code: string; message: string } };
