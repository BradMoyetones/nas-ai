import { Hono } from 'hono';
import { getModelCatalog, getProviderModels } from '../services/ai/model-discovery';
import type { AppEnv } from '../app';
import type { AIProviderId } from '@nas/shared';

const providersRouter = new Hono<AppEnv>();

providersRouter.get('/', async (c) => {
    return c.json([]);
});

export { providersRouter };
