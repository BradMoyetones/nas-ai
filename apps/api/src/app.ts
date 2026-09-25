import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env';
import { authRouter } from './routes/auth';
import { modelsRouter } from './routes/models';
import { providersRouter } from './routes/providers';
import { chatRouter } from './routes/chat.router';
import { conversationsRouter } from './routes/conversations';
import { credentialsRouter } from './routes/credentials';
import { requireAuth, requireVerified } from './middleware/auth';

// ─── Tipos para Hono ──────────────────────────────────────────────────────────

export type AppVariables = {
    user: {
        userId: string;
        email: string;
    };
};

export type AppEnv = {
    Variables: AppVariables;
};

const app = new Hono<AppEnv>();

// ─── Middlewares Globales ────────────────────────────────────────────────────

app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true,
        exposeHeaders: ['X-Conversation-Id', 'X-Is-New-Conversation'],
    })
);

app.use(logger());

// ─── Ruta Pública: Info del Proyecto ─────────────────────────────────────────

app.get('/', (c) => {
    return c.json({
        name: 'nas-api',
        version: '1.0.0',
        description: 'API de streaming de Inteligencia Artificial para NAS',
        status: 'online',
    });
});

// ─── Rutas Públicas: Auth ────────────────────────────────────────────────────

app.route('/api/auth', authRouter);

// ─── Rutas Protegidas: AI ────────────────────────────────────────────────────

app.use('/api/models/*', requireAuth, requireVerified);
app.use('/api/providers/*', requireAuth, requireVerified);
app.use('/api/chat/*', requireAuth, requireVerified);
app.use('/api/conversations/*', requireAuth, requireVerified);
app.use('/api/credentials/*', requireAuth, requireVerified);

import { rateLimit } from './middleware/rate-limit';

app.use('/api/chat/*', rateLimit({ max: 30, windowMs: 60_000 })); // 30 msg/min
app.use('/api/chat', rateLimit({ max: 30, windowMs: 60_000 }));

app.use('/api/auth/*', rateLimit({ max: 10, windowMs: 60_000 })); // 10 auth/min

// Also protect the exact paths (without trailing segments)
app.use('/api/models', requireAuth, requireVerified);
app.use('/api/providers', requireAuth, requireVerified);
app.use('/api/chat', requireAuth, requireVerified);
app.use('/api/conversations', requireAuth, requireVerified);
app.use('/api/credentials', requireAuth, requireVerified);

app.route('/api/models', modelsRouter);
app.route('/api/providers', providersRouter);
app.route('/api/chat', chatRouter);
app.route('/api/conversations', conversationsRouter);
app.route('/api/credentials', credentialsRouter);

// ─── Error Handler Global ────────────────────────────────────────────────────

app.onError((err, c) => {
    console.error('[error]', err.stack || err.message || err);
    return c.json({ error: 'Error interno del servidor.' }, 500);
});

export { app };
