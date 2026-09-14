export interface AIModel {
    id: string;
    name: string;
    description: string;
    icon: string; // Puede mapear a un icono en el frontend (ej. Lucide Icons: 'Bot', 'Zap', 'Sparkles')
    provider: 'openrouter' | 'groq' | 'cerebras';
}

export interface AICategory {
    category: string;
    models: AIModel[];
}

export const modelCatalog: AICategory[] = [
    {
        category: 'Groq (Ultra-Fast)',
        models: [
            {
                id: 'llama-3.1-8b-instant',
                name: 'Llama 3.1 8B',
                description: 'Rápido y capaz para tareas generales',
                icon: 'Zap',
                provider: 'groq',
            },
            {
                id: 'mixtral-8x7b-32768',
                name: 'Mixtral 8x7B',
                description: 'Potente modelo Mixture of Experts',
                icon: 'Layers',
                provider: 'groq',
            },
        ],
    },
    {
        category: 'Cerebras (Lightning)',
        models: [
            {
                id: 'llama3.1-8b',
                name: 'Llama 3.1 8B (Cerebras)',
                description: 'Generación ultrarrápida vía Cerebras CS-3',
                icon: 'Cpu',
                provider: 'cerebras',
            },
        ],
    },
    {
        category: 'OpenRouter (Premium & Free)',
        models: [
            {
                id: 'anthropic/claude-3.5-sonnet',
                name: 'Claude 3.5 Sonnet',
                description: 'Alta inteligencia y razonamiento avanzado',
                icon: 'Bot',
                provider: 'openrouter',
            },
            {
                id: 'openai/gpt-4o',
                name: 'GPT-4o',
                description: 'El modelo insignia de OpenAI',
                icon: 'Sparkles',
                provider: 'openrouter',
            },
            {
                id: 'openrouter/auto',
                name: 'OpenRouter Auto',
                description: 'Elige el mejor modelo gratuito/barato automáticamente',
                icon: 'Wand2',
                provider: 'openrouter',
            },
        ],
    },
];

export function getModelById(id: string): AIModel | undefined {
    for (const category of modelCatalog) {
        const model = category.models.find((m) => m.id === id);
        if (model) return model;
    }
    return undefined;
}
