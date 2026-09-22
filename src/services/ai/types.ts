import type { ChatRole } from '@/types/message';

export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export type ProviderStreamChunk = {
    content?: string;
    reasoningTokens?: number;
};

export type AIProviderId =
    | 'openrouter'
    | 'groq'
    | 'cerebras'
    | 'google';

/**
 * Metadata persistida asociada a un mensaje.
 *
 * Actualmente solo tenemos metadata para errores de generación,
 * pero este tipo está preparado para crecer con nuevas variantes.
 */
export type GenerationErrorMetadata = {
    type: 'generation_error';

    /**
     * Código normalizado por nuestra aplicación.
     *
     * Ejemplos:
     * - RATE_LIMITED
     * - PROVIDER_AUTH_ERROR
     * - INVALID_REQUEST
     * - MODEL_NOT_FOUND
     * - PROVIDER_UNAVAILABLE
     * - PROVIDER_NETWORK_ERROR
     * - GENERATION_FAILED
     */
    code: string;

    provider: AIProviderId;
    modelId: string;

    /**
     * HTTP status entregado por el provider, cuando exista.
     */
    status?: number;

    /**
     * Indica si la operación tiene sentido reintentarse.
     */
    retryable: boolean;

    /**
     * Código original proporcionado por el provider.
     *
     * Ejemplo en Google:
     * RESOURCE_EXHAUSTED
     * INVALID_ARGUMENT
     */
    providerCode?: string;

    /**
     * Mensaje técnico original del provider.
     *
     * Este dato sirve para debugging/observabilidad y NO debe
     * mostrarse directamente al usuario.
     */
    technicalMessage?: string;

    /**
     * Identificador de request/traza entregado por el provider,
     * cuando esté disponible.
     */
    requestId?: string;
};

/**
 * Metadata de cualquier mensaje persistido.
 *
 * Se utiliza como discriminated union para poder agregar
 * posteriormente otros tipos de metadata sin perder tipado.
 */
export type MessageMetadata =
    | GenerationErrorMetadata;

/**
 * Discriminated union de todos los eventos SSE
 * que puede emitir el backend hacia el frontend.
 */
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