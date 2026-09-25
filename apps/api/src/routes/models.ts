import { Hono } from 'hono';
import { getModelCatalog, getProviderModels } from '../services/ai/model-discovery';
import { SUPPORTED_PROVIDER_IDS } from '../config/providers';
import type { AppEnv } from '../app';
import type { AIProviderId } from '@nas/shared';

const modelsRouter = new Hono<AppEnv>();

/**
 * GET /api/models
 *
 * Retorna el catálogo completo de modelos agrupado por proveedor.
 * Resuelve automáticamente las credenciales del usuario si las tiene,
 * de lo contrario usa las del servidor.
 */
modelsRouter.get('/', async (c) => {
    try {
        const user = c.get('user'); // Si viene del middleware auth
        const categories = await getModelCatalog(user?.userId);
        return c.json({ categories });
    } catch (error) {
        console.error('[models] Error al obtener catálogo:', error);
        return c.json({ error: 'Error al obtener catálogo de modelos' }, 500);
    }
});

/**
 * GET /api/models/:provider
 *
 * Lista modelos específicos de un proveedor, transformados al formato estándar.
 */
modelsRouter.get('/:provider', async (c) => {
    const provider = c.req.param('provider') as AIProviderId;
    const user = c.get('user');

    // Validación básica
    if (!SUPPORTED_PROVIDER_IDS.includes(provider)) {
        return c.json({ error: 'Proveedor no soportado' }, 400);
    }

    try {
        const models = await getProviderModels(provider, user?.userId);
        
        if (models.length === 0) {
            return c.json({ 
                error: `No se pudieron obtener modelos para ${provider}. Verifica tus credenciales.` 
            }, 404);
        }

        return c.json(models);
    } catch (error: any) {
        console.error(`[models] Error al obtener modelos de ${provider}:`, error);
        return c.json({ error: error.message || 'Error interno' }, 500);
    }
});

export { modelsRouter };
