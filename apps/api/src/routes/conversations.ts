import { Hono } from 'hono';
import { prisma } from '../db';
import type { AppEnv } from '../app';

const conversationsRouter = new Hono<AppEnv>();

// ─── GET ALL CONVERSATIONS FOR CURRENT USER ──────────────────────────────
conversationsRouter.get('/', async (c) => {
    try {
        const user = c.get('user');

        const conversations = await prisma.conversation.findMany({
            where: {
                userId: user.userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return c.json({ conversations });
    } catch (error: any) {
        console.error('[conversations] GET / error:', error);
        return c.json({ error: 'Error al obtener conversaciones' }, 500);
    }
});

// ─── GET SPECIFIC CONVERSATION ───────────────────────────────────────────
conversationsRouter.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const user = c.get('user');

        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                userId: user.userId
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        if (!conversation) {
            return c.json({ error: 'Conversación no encontrada' }, 404);
        }

        return c.json({ conversation });
    } catch (error: any) {
        console.error(`[conversations] GET /${c.req.param('id')} error:`, error);
        return c.json({ error: 'Error al obtener conversación' }, 500);
    }
});

// ─── POST CREATE CONVERSATION ────────────────────────────────────────────
conversationsRouter.post('/', async (c) => {
    try {
        const { title } = await c.req.json();
        const user = c.get('user');

        const conversation = await prisma.conversation.create({
            data: {
                userId: user.userId,
                title: title || 'Nueva conversación'
            }
        });

        return c.json({ conversation }, 201);
    } catch (error: any) {
        console.error('[conversations] POST / error:', error);
        return c.json({ error: 'Error al crear conversación' }, 500);
    }
});

// ─── DELETE CONVERSATION ────────────────────────────────────────────
conversationsRouter.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const user = c.get('user');

        await prisma.conversation.delete({
            where: {
                id,
                userId: user.userId
            }
        });

        return c.json({ message: 'Conversación eliminada' });
    } catch (error: any) {
        console.error(`[conversations] DELETE /${c.req.param('id')} error:`, error);
        return c.json({ error: 'Error al eliminar conversación' }, 500);
    }
});

export { conversationsRouter };
