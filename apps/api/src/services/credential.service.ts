import { prisma } from '../db';
import { encrypt, decrypt } from './crypto/encryption';
import type { AIProviderId } from '@nas/shared';

export const credentialService = {
    /**
     * Guarda o actualiza una credencial de proveedor para un usuario.
     */
    async upsert(userId: string, providerId: string, apiKey: string, label?: string) {
        const { encrypted, iv, authTag } = encrypt(apiKey);

        return prisma.providerCredential.upsert({
            where: {
                userId_providerId: { userId, providerId },
            },
            create: {
                userId,
                providerId,
                encryptedKey: encrypted,
                iv,
                authTag,
                label,
            },
            update: {
                encryptedKey: encrypted,
                iv,
                authTag,
                label,
                isValid: true,
            },
            select: {
                id: true,
                providerId: true,
                label: true,
                isValid: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },

    /**
     * Obtiene todas las credenciales de un usuario (sin exponer la clave).
     */
    async listForUser(userId: string) {
        return prisma.providerCredential.findMany({
            where: { userId },
            select: {
                id: true,
                providerId: true,
                label: true,
                isValid: true,
                lastValidated: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    },

    /**
     * Descifra y retorna la API key de un proveedor para un usuario.
     * Retorna null si no existe.
     */
    async resolveApiKey(userId: string, providerId: string): Promise<string | null> {
        const credential = await prisma.providerCredential.findUnique({
            where: {
                userId_providerId: { userId, providerId },
            },
        });

        if (!credential || !credential.isValid) {
            return null;
        }

        try {
            return decrypt(credential.encryptedKey, credential.iv, credential.authTag);
        } catch {
            // Si el descifrado falla, marcar como inválida
            await prisma.providerCredential.update({
                where: { id: credential.id },
                data: { isValid: false },
            });
            return null;
        }
    },

    /**
     * Elimina una credencial.
     */
    async delete(userId: string, providerId: string) {
        return prisma.providerCredential.deleteMany({
            where: { userId, providerId },
        });
    },

    /**
     * Marca una credencial como validada.
     */
    async markValidated(userId: string, providerId: string, isValid: boolean) {
        await prisma.providerCredential.updateMany({
            where: { userId, providerId },
            data: {
                isValid,
                lastValidated: new Date(),
            },
        });
    },
};
