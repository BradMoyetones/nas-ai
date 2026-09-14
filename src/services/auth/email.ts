import nodemailer from 'nodemailer';
import { env } from '../../config/env';

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: 'Verifica tu correo electrónico - NAS AI',
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Bienvenido a NAS AI</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Gracias por registrarte. Para completar tu registro, haz clic en el siguiente botón para verificar tu correo electrónico:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500; display: inline-block;">
            Verificar correo
          </a>
        </div>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">
          Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
        </p>
        <p style="color: #888; font-size: 13px; word-break: break-all;">${verifyUrl}</p>
        <p style="color: #888; font-size: 13px; margin-top: 32px;">Este enlace expira en 24 horas.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px;">Si no te registraste en NAS AI, puedes ignorar este correo.</p>
      </div>
    `,
    });
}

export async function sendLoginCode(email: string, code: string): Promise<void> {
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: email,
        subject: `Tu código de acceso: ${code} - NAS AI`,
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Código de verificación</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Tu código de acceso es:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="background-color: #f5f5f5; color: #000; padding: 16px 40px; font-size: 36px; font-weight: 700; letter-spacing: 8px; border-radius: 12px; display: inline-block; border: 2px solid #e0e0e0;">
            ${code}
          </span>
        </div>
        <p style="color: #888; font-size: 14px; line-height: 1.5;">
          Introduce este código en la aplicación para iniciar sesión. El código expira en <strong>10 minutos</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px;">Si no intentaste iniciar sesión, cambia tu contraseña inmediatamente.</p>
      </div>
    `,
    });
}
