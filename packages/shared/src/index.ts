/**
 * @nas/shared
 *
 * Tipos y contratos compartidos entre el backend y el frontend
 * de la plataforma NAS AI.
 *
 * IMPORTANTE: Este paquete NO debe importar módulos de Node.js,
 * Prisma, ni ninguna dependencia específica del servidor.
 */

// Proveedores
export type { AIProviderId, AIProvider } from './providers';

// Modelos
export type { AIModel, AICategory, ModelCapabilities, ModelPricing } from './models';

// Mensajes
export type { GenerationErrorMetadata, MessageMetadata } from './messages';

// Streaming
export type { ChatStreamEvent } from './streaming';

// Schemas (Zod) — usables en frontend (react-hook-form) y backend (validación)
export {
    chatMessageSchema,
    type ChatMessageInput,
    createConversationSchema,
    updateConversationSchema,
    type CreateConversationInput,
    type UpdateConversationInput,
    createCredentialSchema,
    type CreateCredentialInput,
} from './schemas';
