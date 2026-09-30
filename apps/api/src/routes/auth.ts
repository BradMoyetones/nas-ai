import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { prisma } from '../db';
import { hashPassword, comparePassword } from '../services/auth/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/auth/jwt';
import { generateVerificationToken, generateLoginCode } from '../services/auth/codes';
import { sendVerificationEmail, sendLoginCode } from '../services/auth/email';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';
import type { AppEnv } from '../app';

const authRouter = new Hono<AppEnv>();

const COOKIE_OPTIONS = {
    httpOnly: true,
    // secure: env.NODE_ENV === 'production', // -> Se comenta porque los puertos no están en https
    secure: false,
    sameSite: (env.NODE_ENV === 'production' ? 'None' : 'Lax') as 'None' | 'Lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
} as const;

// ─── REGISTER ────────────────────────────────────────────────────────────────

authRouter.post('/register', async (c) => {
    const { username, email, password } = await c.req.json();

    if (!username || !email || !password) {
        return c.json({ error: 'Campos username, email y password son requeridos.' }, 400);
    }

    if (password.length < 8) {
        return c.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
    }

    // Verificar si ya existe
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });

    if (existing) {
        return c.json({ error: 'El email o nombre de usuario ya están registrados.' }, 409);
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
            auth: { create: {} },
        },
    });

    // Generar token de verificación
    const token = generateVerificationToken();
    await prisma.emailVerification.create({
        data: {
            userId: user.id,
            token,
            type: 'email_verification',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
    });

    // Enviar correo de verificación
    try {
        await sendVerificationEmail(email, token);
    } catch (err) {
        console.error('[auth] Error enviando email de verificación:', err);
    }

    return c.json({
        message: 'Registro exitoso. Revisa tu correo electrónico para verificar tu cuenta.',
        user: { id: user.id, username: user.username, email: user.email },
    }, 201);
});

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────

authRouter.get('/verify-email/:token', async (c) => {
    const token = c.req.param('token');

    const verification = await prisma.emailVerification.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!verification) {
        return c.json({ error: 'Token de verificación no encontrado.' }, 404);
    }

    if (verification.usedAt) {
        return c.json({ error: 'Este enlace ya fue utilizado.' }, 400);
    }

    if (new Date() > verification.expiresAt) {
        return c.json({ error: 'El enlace de verificación ha expirado.' }, 400);
    }

    // Marcar como verificado
    await prisma.$transaction([
        prisma.user.update({
            where: { id: verification.userId },
            data: { isVerified: true },
        }),
        prisma.emailVerification.update({
            where: { id: verification.id },
            data: { usedAt: new Date() },
        }),
    ]);

    return c.json({ message: '¡Correo verificado exitosamente! Ya puedes iniciar sesión.' });
});

// ─── LOGIN (Step 1: Credentials → Send 2FA Code) ────────────────────────────

authRouter.post('/login', async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
        return c.json({ error: 'Campos email y password son requeridos.' }, 400);
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { auth: true },
    });

    if (!user) {
        return c.json({ error: 'Credenciales inválidas.' }, 401);
    }

    // Verificar bloqueo por intentos fallidos
    if (user.auth?.lockedUntil && new Date() < user.auth.lockedUntil) {
        const minutesLeft = Math.ceil((user.auth.lockedUntil.getTime() - Date.now()) / 60000);
        return c.json({ error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minutos.` }, 429);
    }

    const passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
        // Incrementar intentos fallidos
        if (user.auth) {
            const newAttempts = user.auth.failedAttempts + 1;
            await prisma.userAuth.update({
                where: { userId: user.id },
                data: {
                    failedAttempts: newAttempts,
                    // Bloquear después de 5 intentos fallidos por 15 minutos
                    ...(newAttempts >= 5 ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
                },
            });
        }
        return c.json({ error: 'Credenciales inválidas.' }, 401);
    }

    // Resetear intentos fallidos
    if (user.auth) {
        await prisma.userAuth.update({
            where: { userId: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
        });
    }

    // Generar código 2FA y enviarlo por correo
    const code = generateLoginCode();
    const challenge = await prisma.loginChallenge.create({
        data: {
            userId: user.id,
            code,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
        },
    });

    try {
        await sendLoginCode(user.email, code);
    } catch (err) {
        console.error('[auth] Error enviando código 2FA:', err);
        // No bloqueamos el flujo — el código se creó en la BD correctamente
    }

    return c.json({
        message: 'Código de verificación enviado a tu correo electrónico.',
        challenge: {
            id: challenge.id,
            expiresAt: challenge.expiresAt,
        }
    });
});

// ─── LOGIN VERIFY (Step 2: Verify 2FA Code → Issue JWT) ─────────────────────

authRouter.post('/login/verify', async (c) => {
    const { challengeId, code } = await c.req.json();

    if (!challengeId || !code) {
        return c.json({ error: 'Campos challengeId y code son requeridos.' }, 400);
    }

    const challenge = await prisma.loginChallenge.findUnique({
        where: { id: challengeId },
        include: { user: true },
    });

    if (!challenge) {
        return c.json({ error: 'Desafío de login no encontrado.' }, 404);
    }

    if (challenge.usedAt) {
        return c.json({ error: 'Este código ya fue utilizado.', hola: "mundo" }, 400);
    }

    if (new Date() > challenge.expiresAt) {
        return c.json({ error: 'El código ha expirado. Inicia sesión nuevamente.' }, 400);
    }

    // Máximo 3 intentos por código
    if (challenge.attempts >= 3) {
        return c.json({ error: 'Demasiados intentos. Inicia sesión nuevamente.' }, 429);
    }

    if (challenge.code !== code) {
        await prisma.loginChallenge.update({
            where: { id: challenge.id },
            data: { attempts: challenge.attempts + 1 },
        });
        return c.json({ error: 'Código incorrecto.' }, 401);
    }

    // Código válido — marcar como usado
    await prisma.loginChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() },
    });

    // Generar tokens JWT
    const tokenPayload = { userId: challenge.user.id, email: challenge.user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Guardar refresh token en BD
    await prisma.userAuth.update({
        where: { userId: challenge.user.id },
        data: { refreshToken, lastLoginAt: new Date() },
    });

    // Setear cookies
    setCookie(c, 'access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 }); // 15 min
    setCookie(c, 'refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 }); // 7 días

    return c.json({
        message: 'Inicio de sesión exitoso.',
        user: {
            id: challenge.user.id,
            username: challenge.user.username,
            email: challenge.user.email,
            isVerified: challenge.user.isVerified,
        },
    });
});

authRouter.get('/login/challenge/:id', async (c) => {
    const id = c.req.param('id');

    const challenge = await prisma.loginChallenge.findUnique({
        where: { id },
        include: { user: true },
    });

    if (!challenge) {
        return c.json({ error: 'Challenge no encontrado.' }, 404);
    }

    if (new Date() > challenge.expiresAt) {
        return c.json({ error: 'El challenge ha expirado.' }, 400);
    }

    return c.json({
        message: 'Challenge encontrado.',
        challenge: {
            id: challenge.id,
            expiresAt: challenge.expiresAt,
        }
    });
});

// ─── REFRESH TOKEN ───────────────────────────────────────────────────────────

authRouter.post('/refresh', async (c) => {
    const token = getCookie(c, 'refresh_token');

    if (!token) {
        return c.json({ error: 'No hay refresh token.' }, 401);
    }

    try {
        const payload = verifyRefreshToken(token);

        // Verificar que el refresh token coincide con el almacenado en BD
        const auth = await prisma.userAuth.findUnique({
            where: { userId: payload.userId },
            include: { user: true },
        });

        if (!auth || auth.refreshToken !== token) {
            return c.json({ error: 'Refresh token inválido.' }, 401);
        }

        // Generar nuevo access token
        const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email });
        const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email });

        // Rotar refresh token
        await prisma.userAuth.update({
            where: { userId: payload.userId },
            data: { refreshToken: newRefreshToken },
        });

        setCookie(c, 'access_token', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
        setCookie(c, 'refresh_token', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });

        return c.json({ message: 'Token renovado exitosamente.' });
    } catch {
        return c.json({ error: 'Refresh token expirado. Inicia sesión nuevamente.' }, 401);
    }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────

authRouter.post('/logout', requireAuth, async (c) => {
    const user = c.get('user');

    // Revocar refresh token en BD
    await prisma.userAuth.update({
        where: { userId: user.userId },
        data: { refreshToken: null },
    });

    // Limpiar cookies
    setCookie(c, 'access_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
    setCookie(c, 'refresh_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });

    return c.json({ message: 'Sesión cerrada exitosamente.' });
});

// ─── ME (Current User) ──────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (c) => {
    const authUser = c.get('user');

    const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
            createdAt: true,
        },
    });

    if (!user) {
        return c.json({ error: 'Usuario no encontrado.' }, 404);
    }

    return c.json({ user });
});

export { authRouter };
