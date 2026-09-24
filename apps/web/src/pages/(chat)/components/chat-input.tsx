import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowRight, Brain, Square } from 'lucide-react';
import { identifyModel, resolveModelIcon } from "@/components/icons/ai";
import { cn } from 'cn';
import type { AICategory } from '@nas/shared';
import { useState } from 'react';

interface ChatInputProps {
    onSubmit: (text: string) => void;
    isStreaming: boolean;
    onStop: () => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    modelsCategories: AICategory[];
}

export function ChatInput({
    onSubmit,
    isStreaming,
    onStop,
    selectedModel,
    onModelChange,
    modelsCategories,
}: ChatInputProps) {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || isStreaming) return;
        const currentContent = value.trim();
        setValue('');
        onSubmit(currentContent);
    };

    const getCurrentModelData = () => {
        for (const cat of modelsCategories) {
            const model = cat.models.find((m) => m.id === selectedModel);
            if (model) return model;
        }
        return undefined;
    };

    const currentModel = getCurrentModelData();
    const currentModelDescriptor = currentModel ? {
        ...currentModel,
        ...identifyModel(currentModel.id),
    } : null;

    const ModelIconComponent = currentModelDescriptor ? resolveModelIcon(currentModelDescriptor).component : null;

    return (
        <div
            className={cn(`
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
            `)}
        >
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto w-full pointer-events-auto">
                <div
                    className={cn(
                        'relative w-full rounded-3xl border bg-card p-3 cursor-text shadow-sm',
                        isStreaming && 'opacity-80'
                    )}
                >
                    <div className="pb-9">
                        <Textarea
                            placeholder="Pregunta lo que sea..."
                            className="min-h-10 max-h-40 w-full rounded-3xl border-0 bg-transparent! placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 pl-2 pr-4 pt-0 pb-0 resize-none overflow-y-auto leading-tight shadow-none"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            rows={1}
                            disabled={isStreaming}
                        />
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
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
                                                                        <div className="flex flex-col">
                                                                            <span>{model.name}</span>
                                                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                                                {model.description}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </DropdownMenuRadioItem>
                                                            )
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
                            </div>

                            {isStreaming ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => onStop()}
                                >
                                    <Square className="fill-current h-4 w-4" />
                                    <span className="sr-only">Stop</span>
                                </Button>
                            ) : (
                                <Button type="submit" size="icon" disabled={!value.trim()}>
                                    <ArrowRight />
                                    <span className="sr-only">Submit</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
