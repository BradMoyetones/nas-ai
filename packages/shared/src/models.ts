import type { AIProviderId } from './providers';

/**
 * Representación de un modelo de IA en el catálogo.
 */
export interface AIModel {
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
    provider: AIProviderId;
}

/**
 * Agrupación de modelos por categoría de proveedor.
 */
export interface AICategory {
    category: string;
    models: AIModel[];
}
