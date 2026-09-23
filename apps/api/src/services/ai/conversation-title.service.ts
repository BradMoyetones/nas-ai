
import { streamFromProvider } from './engine';
import type { AIModel } from './providers';
import type { ChatMessage } from './types';

interface GenerateConversationTitleParams {
    content: string;
    model: AIModel;
    signal?: AbortSignal;
}

export async function generateConversationTitle({
    content,
    model,
    signal,
}: GenerateConversationTitleParams): Promise<string> {

    const titlePrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `
Generate a short and descriptive title for the conversation based on the user's message.

Rules:
- Maximum 6 words.
- The title must describe the main topic or intent of the user's message.
- Generate the title in the SAME LANGUAGE as the user's original message.
- If the user writes in English, generate the title in English.
- If the user writes in Spanish, generate the title in Spanish.
- If the user writes in another language, generate the title in that same language.
- Do not translate the user's message into another language.
- Do not ask a question.
- Do not use quotation marks.
- Do not use Markdown.
- Do not add explanations.
- Return ONLY the title.
            `.trim(),
        },
        {
            role: 'user',
            content: content.trim().slice(0, 3000),
        },
    ];

    const stream = await streamFromProvider({
        messages: titlePrompt,
        model,
        signal,
    });

    let title = '';

    for await (const chunk of stream) {
        if (chunk.content) {
            title += chunk.content;
        }
    }

    title = title
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .split('\n')[0]
        .trim();

    if (!title) {
        return 'New conversation';
    }

    return title.slice(0, 80);
}