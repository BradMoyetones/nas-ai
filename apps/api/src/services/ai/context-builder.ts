import { ChatRole } from '@/types/message';
import type { ChatMessage } from './types';

export function buildContext(history: { role: string; content: string }[]): ChatMessage[] {
  const context: ChatMessage[] = [];
  
  // Optionally prepend a system message
  context.push({
    role: 'system',
    content: 'You are a helpful AI assistant.',
  });

  // Convert DB messages to ChatMessage format
  for (const msg of history) {
    context.push({
      role: msg.role as ChatRole,
      content: msg.content,
    });
  }

  return context;
}
