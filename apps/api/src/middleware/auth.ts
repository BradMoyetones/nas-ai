import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyAccessToken } from '../services/auth/jwt';
import { prisma } from '../db';
import type { AppEnv } from '../app';

/**
 * Middleware que verifica que el request tenga un JWT válido en la cookie `access_token`.
 * Si es válido, inyecta `c.var.user` con { userId, email }.
 */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
    const token = getCookie(c, 'access_token');

    if (!token) {
        return c.json({ error: 'No autenticado. Inicia sesión.' }, 401);
    }

    try {
        const payload = verifyAccessToken(token);
        c.set('user', { userId: payload.userId, email: payload.email });
        await next();
    } catch {
        return c.json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' }, 401);
    }
}

/**
 * Middleware que además de autenticar, verifica que el usuario tenga su email verificado.
 * Debe usarse DESPUÉS de `requireAuth`.
 */
export async function requireVerified(c: Context<AppEnv>, next: Next) {
    const user = c.get('user');

    if (!user) {
        return c.json({ error: 'No autenticado.' }, 401);
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { isVerified: true },
    });

    if (!dbUser) {
        return c.json({ error: 'Usuario no encontrado.' }, 401);
    }

    if (!dbUser.isVerified) {
        return c.json({ error: 'Debes verificar tu correo electrónico antes de acceder a este recurso.' }, 403);
    }

    await next();
}
