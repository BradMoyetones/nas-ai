import { generateText } from 'ai';
import type { AIModel } from '@nas/shared';
import { resolveModel } from './provider-registry';

interface GenerateConversationTitleParams {
    content: string;
    model: AIModel;
    signal?: AbortSignal;
}

const TITLE_SYSTEM_PROMPT = `
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
`.trim();

export async function generateConversationTitle({
    content,
    model,
    signal,
}: GenerateConversationTitleParams): Promise<string> {
    const aiModel = resolveModel(model.provider, model.id);

    const { text } = await generateText({
        model: aiModel,
        system: TITLE_SYSTEM_PROMPT,
        prompt: content.trim().slice(0, 3000),
        abortSignal: signal,
    });

    let title = text
        .replace(/^["'""]+|["'""]+$/g, '')
        .split('\n')[0]
        .trim();

    if (!title) {
        return 'New conversation';
    }

    return title.slice(0, 80);
}