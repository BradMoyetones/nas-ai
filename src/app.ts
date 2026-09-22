import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { authRouter } from './routes/auth';
import { modelsRouter } from './routes/models';
import { chatRouter } from './routes/chat.router';
import { conversationsRouter } from './routes/conversations';
import { requireAuth, requireVerified } from './middleware/auth';

const app = express();

// ─── Middlewares Globales ────────────────────────────────────────────────────

app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// ─── Request Logging ─────────────────────────────────────────────────────────

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`[http] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});

// ─── Ruta Pública: Info del Proyecto ─────────────────────────────────────────

app.get('/', (req, res) => {
    res.status(200).json({
        name: 'nas-api',
        version: '1.0.0',
        description: 'API de streaming de Inteligencia Artificial para NAS',
        status: 'online',
    });
});

// ─── Rutas Públicas: Auth ────────────────────────────────────────────────────

app.use('/api/auth', authRouter);

// ─── Rutas Protegidas: AI ────────────────────────────────────────────────────

app.use('/api/models', requireAuth, requireVerified, modelsRouter);
app.use('/api/chat', requireAuth, requireVerified, chatRouter);
app.use('/api/conversations', requireAuth, requireVerified, conversationsRouter);

// ─── Error Handler Global ────────────────────────────────────────────────────

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[error]', err.stack || err.message || err);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

export { app };
