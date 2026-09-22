import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// ─── GET ALL CONVERSATIONS FOR CURRENT USER ──────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                userId: req.user!.userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({ conversations });
    } catch (error: any) {
        console.error('[conversations] GET / error:', error);
        res.status(500).json({ error: 'Error al obtener conversaciones' });
    }
});

// ─── GET SPECIFIC CONVERSATION ───────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                userId: req.user!.userId
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
            res.status(404).json({ error: 'Conversación no encontrada' });
            return;
        }

        res.status(200).json({ conversation });
    } catch (error: any) {
        console.error(`[conversations] GET /${req.params.id} error:`, error);
        res.status(500).json({ error: 'Error al obtener conversación' });
    }
});

// ─── POST CREATE CONVERSATION ────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    try {
        const { title } = req.body;

        const conversation = await prisma.conversation.create({
            data: {
                userId: req.user!.userId,
                title: title || 'Nueva conversación'
            }
        });

        res.status(201).json({ conversation });
    } catch (error: any) {
        console.error('[conversations] POST / error:', error);
        res.status(500).json({ error: 'Error al crear conversación' });
    }
});

// ─── DELETE CONVERSATION ────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        await prisma.conversation.delete({
            where: {
                id,
                userId: req.user!.userId
            }
        });

        res.status(200).json({ message: 'Conversación eliminada' });
    } catch (error: any) {
        console.error(`[conversations] DELETE /${req.params.id} error:`, error);
        res.status(500).json({ error: 'Error al eliminar conversación' });
    }
});

export { router as conversationsRouter };
