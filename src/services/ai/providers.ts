export interface AIModel {
    id: string;
    name: string;
    description: string;
    icon: string;
    provider: 'openrouter' | 'groq' | 'cerebras' | 'google';
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
                id: 'openai/gpt-oss-120b',
                name: 'GPT OSS 120B',
                description: 'Modelo masivo Open Source optimizado para velocidad',
                icon: 'Zap',
                provider: 'groq',
            },
            {
                id: 'groq/compound',
                name: 'Groq Compound',
                description: 'Modelo propio de Groq de alto rendimiento',
                icon: 'Brain',
                provider: 'groq',
            },
            {
                id: 'qwen/qwen3.8-27b',
                name: 'Qwen 3.8 27B',
                description: 'Modelo ligero para tareas rápidas',
                icon: 'Bot',
                provider: 'groq',
            },
        ],
    },
    {
        category: 'Cerebras (Lightning)',
        models: [
            {
                id: 'gpt-oss-120b',
                name: 'GPT OSS 120B',
                description: 'Poder de 120B parámetros con chips Cerebras',
                icon: 'Cpu',
                provider: 'cerebras',
            },
            {
                id: 'gemma-4-31b',
                name: 'Gemma 4 31B',
                description: 'Gemma 4 ultra rápido en hardware Cerebras',
                icon: 'Gem',
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
                id: 'nvidia/nemotron-3.5-lightning:free',
                name: 'Nemotron 3.5 Lightning',
                description: 'Modelo eficiente y gratuito de Nvidia',
                icon: 'Search',
                provider: 'openrouter',
            },
            {
                id: 'nex-agi/nex-n2.5-pro:free',
                name: 'NEX 2.5 Pro',
                description: 'Alto razonamiento de NEX AGI capa gratuita',
                icon: 'Sparkles',
                provider: 'openrouter',
            },
        ],
    },
    {
        category: 'Google AI',
        models: [
            {
                id: 'gemini-3.8-flash',
                name: 'Gemini 3.8 Flash',
                description:
                    'Gemini 3.8 Flash is our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows—all with the speed and cost efficiency of Flash.',
                icon: 'Gem',
                provider: 'google',
            },
            {
                id: 'gemini-3.8-live-extended-thinking',
                name: 'Gemini 3.8 Live Extended Thinking',
                description:
                    'Gemini 3.8 Live Extended Thinking is our specialized Live API model designed for complex reasoning, multi-step planning, and long-horizon state tracking during real-time multimodal sessions. It supports configurable thinking levels (MINIMAL, LOW, MEDIUM, HIGH), thought summaries, and asynchronous function calling.',
                icon: 'Gem',
                provider: 'google',
            },
            {
                id: 'gemini-3.5-flash',
                name: 'Gemini 3.5 Flash',
                description:
                    'Gemini 3.5 Flash provides sustained frontier-level intelligence optimized for real-world tasks at a higher speed and lower cost. Designed for the agentic era, it excels at sub-agent deployment, multi-step workflows, and long-horizon tasks at scale. This model is particularly effective for rapid agentic loops involving complex coding cycles and iterations.',
                icon: 'Gem',
                provider: 'google',
            },
            {
                id: 'gemini-3.5-flash-lite',
                name: 'Gemini 3.5 Flash Lite',
                description:
                    'Gemini 3.5 Flash-Lite is a low-latency, cost-effective multimodal model optimized for high-throughput, low-cost execution for subagent tasks and document parsing. The model supports text, image, video, audio, and PDF inputs, and is designed for high-volume agentic workflows, simple data extraction, and applications where latency and API cost are the primary constraints.',
                icon: 'Gem',
                provider: 'google',
            },
            {
                id: 'gemini-3.1-pro-preview',
                name: 'Gemini 3.1 Pro Preview',
                description:
                    "Built to refine the performance and reliability of the Gemini 3 Pro series, Gemini 3.1 Pro Preview provides better thinking, improved token efficiency, and a more grounded, factually consistent experience. It's optimized for software engineering behavior and usability, as well as agentic workflows requiring precise tool usage and reliable multi-step execution across real-world domains.",
                icon: 'Gem',
                provider: 'google',
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
