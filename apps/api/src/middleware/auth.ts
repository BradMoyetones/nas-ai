import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth/jwt';
import { prisma } from '../db';

// Extender la interfaz Request de Express para incluir el usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

/**
 * Middleware que verifica que el request tenga un JWT válido en la cookie `access_token`.
 * Si es válido, inyecta `req.user` con { userId, email }.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.access_token;

    if (!token) {
        res.status(401).json({ error: 'No autenticado. Inicia sesión.' });
        return;
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = { userId: payload.userId, email: payload.email };
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
        return;
    }
}

/**
 * Middleware que además de autenticar, verifica que el usuario tenga su email verificado.
 * Debe usarse DESPUÉS de `requireAuth`.
 */
export async function requireVerified(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        res.status(401).json({ error: 'No autenticado.' });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { isVerified: true },
    });

    if (!user) {
        res.status(401).json({ error: 'Usuario no encontrado.' });
        return;
    }

    if (!user.isVerified) {
        res.status(403).json({ error: 'Debes verificar tu correo electrónico antes de acceder a este recurso.' });
        return;
    }

    next();
}
