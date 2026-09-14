export interface AIModel {
    id: string;
    name: string;
    description: string;
    icon: string;
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
                id: 'llama-3.3-70b-versatile',
                name: 'Llama 3.3 70B',
                description: 'Modelo versátil de alto rendimiento para tareas complejas',
                icon: 'Zap',
                provider: 'groq',
            },
            {
                id: 'qwen-qwq-32b',
                name: 'Qwen QWQ 32B',
                description: 'Modelo de razonamiento profundo y análisis',
                icon: 'Brain',
                provider: 'groq',
            },
            {
                id: 'gemma2-9b-it',
                name: 'Gemma 2 9B',
                description: 'Modelo ligero y eficiente de Google',
                icon: 'Gem',
                provider: 'groq',
            },
        ],
    },
    {
        category: 'Cerebras (Lightning)',
        models: [
            {
                id: 'qwen-3.8-27b',
                name: 'Qwen 3.8 27B',
                description: 'Generación ultrarrápida con hardware Cerebras',
                icon: 'Cpu',
                provider: 'cerebras',
            },
        ],
    },
    {
        category: 'OpenRouter (Multi-Provider)',
        models: [
            {
                id: 'openrouter/auto',
                name: 'Auto (Free)',
                description: 'Selección automática del mejor modelo gratuito disponible',
                icon: 'Wand2',
                provider: 'openrouter',
            },
            {
                id: 'meta-llama/llama-4-scout:free',
                name: 'Llama 4 Scout',
                description: 'Modelo de Meta optimizado para búsqueda y razonamiento',
                icon: 'Search',
                provider: 'openrouter',
            },
            {
                id: 'google/gemma-3-27b-it:free',
                name: 'Gemma 3 27B',
                description: 'Modelo potente y gratuito de Google vía OpenRouter',
                icon: 'Sparkles',
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
