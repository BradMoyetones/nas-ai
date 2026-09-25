/**
 * Identificadores de proveedores de IA soportados.
 */
export type AIProviderId =
    | 'openrouter'
    | 'groq'
    | 'cerebras'
    | 'google';

/**
 * Configuración completa de un proveedor de IA.
 * Compartida entre Frontend y Backend.
 */
export interface AIProvider {
    /** Identificador único del proveedor */
    id: AIProviderId;
    /** Nombre legible (ej: "OpenRouter") */
    name: string;
    /** Breve descripción de lo que ofrece el proveedor */
    description: string;
    /** La variable de entorno que guarda la API key global del servidor */
    envKey: string;
    /** Qué factory del AI SDK se debe usar para instanciar modelos */
    factory: 'openai-compatible' | 'google' | 'groq' | 'openrouter' | 'cerebras';
    /** URL base inyectada en los SDKs */
    baseUrl?: string;
    /** Endpoint de descubrimiento de modelos */
    modelsUrl?: string;
    /** Si este proveedor debe ser incluido en el descubrimiento dinámico global (/api/models) */
    enableDiscovery: boolean;
}
