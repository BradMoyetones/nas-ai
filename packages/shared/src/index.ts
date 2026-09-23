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
export type { AIProviderId } from './providers';

// Modelos
export type { AIModel, AICategory } from './models';

// Mensajes
export type { GenerationErrorMetadata, MessageMetadata } from './messages';

// Streaming
export type { ChatStreamEvent } from './streaming';
