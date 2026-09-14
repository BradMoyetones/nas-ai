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
];

export function getModelById(id: string): AIModel | undefined {
  for (const category of modelCatalog) {
    const model = category.models.find((m) => m.id === id);
    if (model) return model;
  }
  return undefined;
}
