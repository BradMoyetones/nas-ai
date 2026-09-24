import {
    PromptInput,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputTools,
    PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Brain, Eye, Wrench } from 'lucide-react';
import { identifyModel, resolveModelIcon } from '@/components/icons/ai';
import type { AICategory } from '@nas/shared';
import type { ChatStatus } from 'ai';

interface ChatInputProps {
    onSubmit: (text: string) => void;
    status: ChatStatus;
    onStop: () => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    modelsCategories: AICategory[];
}

export function ChatInput({
    onSubmit,
    status,
    onStop,
    selectedModel,
    onModelChange,
    modelsCategories,
}: ChatInputProps) {
    const isStreaming = status === 'streaming' || status === 'submitted';

    const getCurrentModelData = () => {
        for (const cat of modelsCategories) {
            const model = cat.models.find((m) => m.id === selectedModel);
            if (model) return model;
        }
        return undefined;
    };

    const currentModel = getCurrentModelData();
    const currentModelDescriptor = currentModel
        ? { ...currentModel, ...identifyModel(currentModel.id) }
        : null;

    const ModelIconComponent = currentModelDescriptor
        ? resolveModelIcon(currentModelDescriptor).component
        : null;

    return (
        <div
            className={`
                sticky bottom-0
                z-10
                pt-4 pb-4
                pointer-events-none
                before:absolute
                before:inset-x-0
                before:-top-20
                before:bottom-0
                before:pointer-events-none
                before:bg-linear-to-t
                before:from-background
                before:via-background/80
                before:to-transparent
            `}
        >
            <div className="relative max-w-4xl mx-auto w-full pointer-events-auto bg-background">
                <PromptInput
                    onSubmit={(message) => {
                        if (!message.text.trim()) return;
                        onSubmit(message.text.trim());
                    }}
                    className="rounded-3xl"
                >
                    <PromptInputTextarea
                        placeholder="Pregunta lo que sea..."
                        disabled={isStreaming}
                    />
                    <PromptInputFooter>
                        <PromptInputTools>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full h-8 px-3 flex items-center gap-1.5 bg-background"
                                        disabled={isStreaming}
                                    >
                                        {ModelIconComponent ? <ModelIconComponent /> : <Brain />}
                                        <span className="text-sm">{currentModel?.name || 'Modelo'}</span>
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent className="w-64 mb-2" align="start">
                                    <DropdownMenuRadioGroup
                                        value={selectedModel}
                                        onValueChange={onModelChange}
                                    >
                                        {modelsCategories.length > 0 ? (
                                            modelsCategories.map((cat, i) => (
                                                <div key={cat.category}>
                                                    {i > 0 && <DropdownMenuSeparator />}
                                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                                        {cat.category}
                                                    </DropdownMenuLabel>

                                                    {cat.models.map((model) => {
                                                        const identity = identifyModel(model.id);
                                                        const modelIconMeta = {
                                                            ...model,
                                                            ...identity,
                                                        };
                                                        const resolved = resolveModelIcon(modelIconMeta);
                                                        const Icon = resolved.component;

                                                        return (
                                                            <DropdownMenuRadioItem
                                                                key={model.id}
                                                                value={model.id}
                                                                className="cursor-pointer"
                                                                disabled={!model.enabled}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    {Icon ? <Icon /> : <Brain />}
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex flex-col">
                                                                            <span>{model.name}</span>
                                                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                                                {model.description}
                                                                            </span>
                                                                        </div>
                                                                        {model.capabilities && (
                                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                {model.capabilities.reasoning && (
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                                                                        <Brain className="size-3" />
                                                                                        Razonamiento
                                                                                    </span>
                                                                                )}
                                                                                {model.capabilities.imageInput && (
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                                                                        <Eye className="size-3" />
                                                                                        Visión
                                                                                    </span>
                                                                                )}
                                                                                {model.capabilities.tools && (
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                                                                        <Wrench className="size-3" />
                                                                                        Tools
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </DropdownMenuRadioItem>
                                                        );
                                                    })}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-center p-4 text-muted-foreground">
                                                No hay modelos disponibles
                                            </p>
                                        )}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </PromptInputTools>

                        <PromptInputSubmit
                            status={status}
                            onStop={onStop}
                        />
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </div>
    );
}
