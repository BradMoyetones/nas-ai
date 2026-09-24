import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env';
import { authRouter } from './routes/auth';
import { modelsRouter } from './routes/models';
import { chatRouter } from './routes/chat.router';
import { conversationsRouter } from './routes/conversations';
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
app.use('/api/chat/*', requireAuth, requireVerified);
app.use('/api/conversations/*', requireAuth, requireVerified);

// Also protect the exact paths (without trailing segments)
app.use('/api/models', requireAuth, requireVerified);
app.use('/api/chat', requireAuth, requireVerified);
app.use('/api/conversations', requireAuth, requireVerified);

app.route('/api/models', modelsRouter);
app.route('/api/chat', chatRouter);
app.route('/api/conversations', conversationsRouter);

// ─── Error Handler Global ────────────────────────────────────────────────────

app.onError((err, c) => {
    console.error('[error]', err.stack || err.message || err);
    return c.json({ error: 'Error interno del servidor.' }, 500);
});

export { app };
