import dotenv from 'dotenv';

dotenv.config();

export const env = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',

    // AI Providers
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY || '',

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'nas-api-jwt-secret-change-me',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'nas-api-refresh-secret-change-me',

    // SMTP
    SMTP_HOST: process.env.SMTP_HOST || 'mail.portaljaimeduque.net',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '465'),
    SMTP_SECURE: process.env.SMTP_SECURE === 'true' || true,
    SMTP_USER: process.env.SMTP_USER || 'no-reply@portaljaimeduque.net',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || '"NAS AI" <no-reply@portaljaimeduque.net>',

    // Frontend
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '',
};
