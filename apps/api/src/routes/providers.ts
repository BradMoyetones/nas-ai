import { Hono } from 'hono';
import { PROVIDER_CONFIGS } from '../config/providers';
import type { AppEnv } from '../app';

export const providersRouter = new Hono<AppEnv>();

/**
 * GET /api/providers
 *
 * Expone la configuración estática completa de los proveedores disponibles 
 * para el frontend.
 */
providersRouter.get('/', (c) => {
    try {
        const providers = Object.values(PROVIDER_CONFIGS);
        return c.json({ providers });
    } catch (error) {
        console.error('[providers] Error al obtener lista de proveedores:', error);
        return c.json({ error: 'Error al obtener proveedores' }, 500);
    }
});
