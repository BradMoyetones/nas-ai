import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AICategory } from '@nas/shared';

interface ConversationConfigProps {
    conversationId: string;
    currentSystemPrompt?: string | null;
    currentDefaultModel?: string | null;
    modelsCategories: AICategory[];
    onSave: (systemPrompt: string, defaultModel: string) => void;
    isSaving?: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ConversationConfig({
    // conversationId,
    currentSystemPrompt,
    currentDefaultModel,
    modelsCategories,
    onSave,
    isSaving,
    open,
    onOpenChange
}: ConversationConfigProps) {
    const [systemPrompt, setSystemPrompt] = useState(currentSystemPrompt || '');
    const [defaultModel, setDefaultModel] = useState(currentDefaultModel || (modelsCategories[0]?.models[0]?.id || ''));

    const handleSave = () => {
        onSave(systemPrompt, defaultModel);
        onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Configuración</SheetTitle>
                    <SheetDescription>
                        Ajusta el comportamiento del modelo para esta conversación.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-4 px-4">
                    <div className="grid gap-2">
                        <Label htmlFor="system-prompt">System Prompt</Label>
                        <Textarea
                            id="system-prompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Instrucciones para el asistente..."
                            className="min-h-37.5 resize-none"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="default-model">Modelo por defecto</Label>
                        <Select value={defaultModel} onValueChange={setDefaultModel}>
                            <SelectTrigger id="default-model">
                                <SelectValue placeholder="Selecciona un modelo" />
                            </SelectTrigger>
                            <SelectContent>
                                {modelsCategories.map(cat => (
                                    <div key={cat.category} className="pt-2">
                                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                            {cat.category}
                                        </div>
                                        {cat.models.map(model => (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </div>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <SheetFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
