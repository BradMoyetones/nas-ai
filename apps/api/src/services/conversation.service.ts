import { prisma } from '../db';

import type { Conversation } from '@prisma/client';

import type { AIProviderId, MessageMetadata } from '@nas/shared';

import type {
    ChatRole,
    StoredMessage,
} from '@/types/message';

function parseChatRole(role: string): ChatRole {
    if (
        role === 'system' ||
        role === 'user' ||
        role === 'assistant'
    ) {
        return role;
    }

    throw new Error(
        `Invalid message role stored in database: ${role}`
    );
}

function parseProvider(
    provider: string | null
): AIProviderId | null {
    if (provider === null) {
        return null;
    }

    if (
        provider === 'openrouter' ||
        provider === 'groq' ||
        provider === 'cerebras' ||
        provider === 'google'
    ) {
        return provider;
    }

    throw new Error(
        `Invalid AI provider stored in database: ${provider}`
    );
}

function parseMessageMetadata(
    metadata: unknown
): MessageMetadata | null {
    if (
        metadata === null ||
        metadata === undefined
    ) {
        return null;
    }

    if (
        typeof metadata !== 'object' ||
        Array.isArray(metadata)
    ) {
        throw new Error(
            'Invalid message metadata stored in database'
        );
    }

    const value =
        metadata as Record<string, unknown>;

    /*
     * Actualmente solo existe una variante:
     * generation_error.
     */

    if (
        value.type !== 'generation_error'
    ) {
        throw new Error(
            `Unknown message metadata type: ${String(value.type)}`
        );
    }

    if (
        typeof value.code !== 'string' ||
        typeof value.provider !== 'string' ||
        typeof value.modelId !== 'string' ||
        typeof value.retryable !== 'boolean'
    ) {
        throw new Error(
            'Invalid generation_error metadata stored in database'
        );
    }

    const provider = parseProvider(
        value.provider
    );

    if (provider === null) {
        throw new Error(
            'generation_error metadata requires a valid provider'
        );
    }

    const result: MessageMetadata = {
        type: 'generation_error',
        code: value.code,
        provider,
        modelId: value.modelId,
        retryable: value.retryable,
    };

    if (typeof value.status === 'number') {
        result.status = value.status;
    }

    if (
        typeof value.providerCode === 'string'
    ) {
        result.providerCode =
            value.providerCode;
    }

    if (
        typeof value.technicalMessage === 'string'
    ) {
        result.technicalMessage =
            value.technicalMessage;
    }

    if (
        typeof value.requestId === 'string'
    ) {
        result.requestId =
            value.requestId;
    }

    return result;
}

export const conversationService = {
    /**
     * Create a new conversation for a user.
     */
    async create(
        userId: string,
        title: string
    ): Promise<{
        id: string;
        title: string;
    }> {
        return await prisma.conversation.create({
            data: {
                userId,
                title,
            },
            select: {
                id: true,
                title: true,
            },
        });
    },

    /**
     * Get a conversation by ID,
     * validating ownership.
     */
    async getByIdForUser(
        conversationId: string,
        userId: string
    ): Promise<Conversation | null> {
        return await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                userId,
            },
        });
    },

    /**
     * Get all messages for a conversation.
     *
     * Prisma's JsonValue is normalized into
     * the application's MessageMetadata type.
     */
    async getMessages(
        conversationId: string
    ): Promise<StoredMessage[]> {
        const messages =
            await prisma.message.findMany({
                where: {
                    conversationId,
                },
                orderBy: {
                    createdAt: 'asc',
                },
                select: {
                    id: true,
                    role: true,
                    content: true,
                    model: true,
                    provider: true,
                    metadata: true,
                    createdAt: true,
                },
            });

        return messages.map(
            (
                message
            ): StoredMessage => ({
                id: message.id,
                role: parseChatRole(
                    message.role
                ),
                content: message.content,
                model: message.model,
                provider: parseProvider(
                    message.provider
                ),
                metadata:
                    parseMessageMetadata(
                        message.metadata
                    ),
                createdAt:
                    message.createdAt,
            })
        );
    },

    /**
     * Add a message to a conversation.
     */
    async addMessage(
        conversationId: string,
        data: {
            role: ChatRole;
            content: string;
            model?: string;
            provider?: AIProviderId;
            metadata?: MessageMetadata;
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
            reasoningTokens?: number;
            durationMs?: number;
        }
    ): Promise<{ id: string }> {
        return await prisma.message.create({
            data: {
                conversationId,
                role: data.role,
                content: data.content,
                model: data.model,
                provider: data.provider,
                metadata: data.metadata,
                promptTokens: data.promptTokens,
                completionTokens: data.completionTokens,
                totalTokens: data.totalTokens,
                reasoningTokens: data.reasoningTokens,
                durationMs: data.durationMs,
            },
            select: {
                id: true,
            },
        });
    },

    /**
     * Update conversation title.
     */
    async updateTitle(
        conversationId: string,
        title: string
    ): Promise<void> {
        await prisma.conversation.update({
            where: {
                id: conversationId,
            },
            data: {
                title,
            },
        });
    },
};