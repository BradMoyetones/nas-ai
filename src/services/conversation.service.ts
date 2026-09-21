import { prisma } from '../db';
import type { Conversation } from '@prisma/client';

export const conversationService = {
  /** Create a new conversation for a user */
  async create(userId: string, title: string): Promise<{ id: string; title: string }> {
    return await prisma.conversation.create({
      data: {
        userId,
        title,
      },
      select: {
        id: true,
        title: true,
      }
    });
  },

  /** Get a conversation by ID, validating ownership */
  async getByIdForUser(conversationId: string, userId: string): Promise<Conversation | null> {
    return await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });
  },

  /** Get all messages for a conversation (ordered by createdAt asc) */
  async getMessages(conversationId: string): Promise<{ role: string; content: string }[]> {
    return await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        role: true,
        content: true,
      }
    });
  },

  /** Add a message to a conversation */
  async addMessage(conversationId: string, data: { role: string; content: string; model?: string; provider?: string }): Promise<{ id: string }> {
    return await prisma.message.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        model: data.model,
        provider: data.provider,
      },
      select: {
        id: true,
      }
    });
  },

  /** Update conversation title */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  },
};
