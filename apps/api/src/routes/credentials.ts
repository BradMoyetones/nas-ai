import { Hono } from 'hono';
import { credentialService } from '../services/credential.service';
import { createCredentialSchema } from '@nas/shared';
import type { AppEnv } from '../app';

const credentialsRouter = new Hono<AppEnv>();

/**
 * GET /api/credentials
 * Lista las credenciales del usuario (sin exponer keys).
 */
credentialsRouter.get('/', async (c) => {
    const user = c.get('user');
    const credentials = await credentialService.listForUser(user.userId);
    return c.json({ credentials });
});

/**
 * POST /api/credentials
 * Guarda o actualiza una credencial.
 */
credentialsRouter.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();

    const parsed = createCredentialSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Datos inválidos', details: parsed.error.issues }, 400);
    }

    const { providerId, apiKey, label } = parsed.data;

    const credential = await credentialService.upsert(
        user.userId,
        providerId,
        apiKey,
        label,
    );

    return c.json({ credential }, 201);
});

/**
 * DELETE /api/credentials/:id
 * Elimina una credencial.
 */
credentialsRouter.delete('/:id', async (c) => {
    const id = c.req.param('id');

    await credentialService.delete(id);

    return c.json({ message: 'Credencial eliminada correctamente' });
});

export { credentialsRouter };
