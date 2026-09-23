import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db';
import { hashPassword, comparePassword } from '../services/auth/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/auth/jwt';
import { generateVerificationToken, generateLoginCode } from '../services/auth/codes';
import { sendVerificationEmail, sendLoginCode } from '../services/auth/email';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

// ─── REGISTER ────────────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        res.status(400).json({ error: 'Campos username, email y password son requeridos.' });
        return;
    }

    if (password.length < 8) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        return;
    }

    // Verificar si ya existe
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });

    if (existing) {
        res.status(409).json({ error: 'El email o nombre de usuario ya están registrados.' });
        return;
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

    res.status(201).json({
        message: 'Registro exitoso. Revisa tu correo electrónico para verificar tu cuenta.',
        user: { id: user.id, username: user.username, email: user.email },
    });
});

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────

router.get('/verify-email/:token', async (req: Request, res: Response) => {
    const { token } = req.params as { token: string };

    const verification = await prisma.emailVerification.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!verification) {
        res.status(404).json({ error: 'Token de verificación no encontrado.' });
        return;
    }

    if (verification.usedAt) {
        res.status(400).json({ error: 'Este enlace ya fue utilizado.' });
        return;
    }

    if (new Date() > verification.expiresAt) {
        res.status(400).json({ error: 'El enlace de verificación ha expirado.' });
        return;
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

    res.status(200).json({ message: '¡Correo verificado exitosamente! Ya puedes iniciar sesión.' });
});

// ─── LOGIN (Step 1: Credentials → Send 2FA Code) ────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Campos email y password son requeridos.' });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { auth: true },
    });

    if (!user) {
        res.status(401).json({ error: 'Credenciales inválidas.' });
        return;
    }

    // Verificar bloqueo por intentos fallidos
    if (user.auth?.lockedUntil && new Date() < user.auth.lockedUntil) {
        const minutesLeft = Math.ceil((user.auth.lockedUntil.getTime() - Date.now()) / 60000);
        res.status(429).json({ error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minutos.` });
        return;
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
        res.status(401).json({ error: 'Credenciales inválidas.' });
        return;
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

    res.status(200).json({
        message: 'Código de verificación enviado a tu correo electrónico.',
        challenge: {
            id: challenge.id,
            expiresAt: challenge.expiresAt,
        }
    });
});

// ─── LOGIN VERIFY (Step 2: Verify 2FA Code → Issue JWT) ─────────────────────

router.post('/login/verify', async (req: Request, res: Response) => {
    const { challengeId, code } = req.body;

    if (!challengeId || !code) {
        res.status(400).json({ error: 'Campos challengeId y code son requeridos.' });
        return;
    }

    const challenge = await prisma.loginChallenge.findUnique({
        where: { id: challengeId },
        include: { user: true },
    });

    if (!challenge) {
        res.status(404).json({ error: 'Desafío de login no encontrado.' });
        return;
    }

    if (challenge.usedAt) {
        res.status(400).json({ error: 'Este código ya fue utilizado.' });
        return;
    }

    if (new Date() > challenge.expiresAt) {
        res.status(400).json({ error: 'El código ha expirado. Inicia sesión nuevamente.' });
        return;
    }

    // Máximo 3 intentos por código
    if (challenge.attempts >= 3) {
        res.status(429).json({ error: 'Demasiados intentos. Inicia sesión nuevamente.' });
        return;
    }

    if (challenge.code !== code) {
        await prisma.loginChallenge.update({
            where: { id: challenge.id },
            data: { attempts: challenge.attempts + 1 },
        });
        res.status(401).json({ error: 'Código incorrecto.' });
        return;
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
    res.cookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 }); // 15 min
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 días

    res.status(200).json({
        message: 'Inicio de sesión exitoso.',
        user: {
            id: challenge.user.id,
            username: challenge.user.username,
            email: challenge.user.email,
            isVerified: challenge.user.isVerified,
        },
    });
});

router.get('/login/challenge/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const challenge = await prisma.loginChallenge.findUnique({
        where: { id },
        include: { user: true },
    });

    if (!challenge) {
        res.status(404).json({ error: 'Challenge no encontrado.' });
        return;
    }

    if (new Date() > challenge.expiresAt) {
        res.status(400).json({ error: 'El challenge ha expirado.' });
        return;
    }

    res.status(200).json({
        message: 'Challenge encontrado.',
        challenge: {
            id: challenge.id,
            expiresAt: challenge.expiresAt,
        }
    });
});

// ─── REFRESH TOKEN ───────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token;

    if (!token) {
        res.status(401).json({ error: 'No hay refresh token.' });
        return;
    }

    try {
        const payload = verifyRefreshToken(token);

        // Verificar que el refresh token coincide con el almacenado en BD
        const auth = await prisma.userAuth.findUnique({
            where: { userId: payload.userId },
            include: { user: true },
        });

        if (!auth || auth.refreshToken !== token) {
            res.status(401).json({ error: 'Refresh token inválido.' });
            return;
        }

        // Generar nuevo access token
        const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email });
        const newRefreshToken = generateRefreshToken({ userId: payload.userId, email: payload.email });

        // Rotar refresh token
        await prisma.userAuth.update({
            where: { userId: payload.userId },
            data: { refreshToken: newRefreshToken },
        });

        res.cookie('access_token', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.status(200).json({ message: 'Token renovado exitosamente.' });
    } catch {
        res.status(401).json({ error: 'Refresh token expirado. Inicia sesión nuevamente.' });
    }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
    // Revocar refresh token en BD
    await prisma.userAuth.update({
        where: { userId: req.user!.userId },
        data: { refreshToken: null },
    });

    // Limpiar cookies
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);

    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
});

// ─── ME (Current User) ──────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
            createdAt: true,
        },
    });

    if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
    }

    res.status(200).json({ user });
});

export { router as authRouter };
