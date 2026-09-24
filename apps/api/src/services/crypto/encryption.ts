import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Obtiene la clave de cifrado del entorno.
 * En producción debe ser una clave de 32 bytes en hex.
 * En desarrollo genera una determinística.
 */
function getEncryptionKey(): Buffer {
    const keyHex = env.ENCRYPTION_KEY;
    if (keyHex && keyHex.length === 64) {
        return Buffer.from(keyHex, 'hex');
    }
    // Desarrollo: derivar de JWT_SECRET para no requerir config extra
    return createHash('sha256').update(env.JWT_SECRET).digest();
}

export function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag,
    };
}

export function decrypt(encrypted: string, iv: string, authTag: string): string {
    const key = getEncryptionKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'), { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
