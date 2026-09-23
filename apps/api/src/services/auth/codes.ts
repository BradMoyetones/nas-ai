import crypto from 'crypto';

export function generateVerificationToken(): string {
    return crypto.randomUUID();
}

export function generateLoginCode(): string {
    // Genera un código numérico de 6 dígitos
    return Math.floor(100000 + Math.random() * 900000).toString();
}
