export type AIProviderId =
    | 'openrouter'
    | 'groq'
    | 'cerebras'
    | 'google';

export type ChatStreamEvent =
    | {
          event: 'conversation.created';
          data: {
              id: string;
              title: string;
          };
      }
    | {
          event: 'conversation.title';
          data: {
              id: string;
              title: string;
          };
      }
    | {
          event: 'message.delta';
          data: {
              content: string;
          };
      }
    | {
          event: 'message.completed';
          data: {
              messageId: string;
              model: string;
              provider: AIProviderId;
              usage?: {
                  reasoningTokens?: number;
              };
          };
      }
    | {
          event: 'message.error';
          data: {
              messageId?: string;
              model: string;
              provider: AIProviderId;
              code: string;
              status?: number;
              message: string;
              retryable: boolean;
          };
      }
    | {
          event: 'generation.done';
          data: {
              status: 'success' | 'error';
              elapsedMs: number;
              chunkCount: number;
          };
      };