import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../app';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

interface RateLimitOptions {
    /** Máximo de requests en la ventana */
    max: number;
    /** Ventana de tiempo en milisegundos */
    windowMs: number;
}

export function rateLimit({ max, windowMs }: RateLimitOptions) {
    return createMiddleware<AppEnv>(async (c, next) => {
        // Usar IP + userId (si está autenticado) como clave
        const user = c.get('user');
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        const key = user ? `user:${user.userId}` : `ip:${ip}`;

        const now = Date.now();
        let entry = store.get(key);

        if (!entry || now > entry.resetAt) {
            entry = { count: 0, resetAt: now + windowMs };
            store.set(key, entry);
        }

        entry.count++;

        // Headers informativos
        c.header('X-RateLimit-Limit', String(max));
        c.header('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
        c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > max) {
            return c.json(
                { error: 'Demasiadas solicitudes. Intenta más tarde.' },
                429
            );
        }

        await next();
    });
}
