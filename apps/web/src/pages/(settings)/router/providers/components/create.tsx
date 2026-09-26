import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { credentialCreateFormSchema, type CredentialCreateFormValues, type ProviderCredentialInfo } from "@/services/credential";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { credentialService } from "@/lib/axios";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { AIProvider } from "@nas/shared";
import { useEffect, useMemo } from "react";
import { Loader } from "@/components/loader";

type Props = {
    open: boolean;
    onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
    editing?: ProviderCredentialInfo;
    onDataSaved?: (credential: ProviderCredentialInfo) => void;
    providers: AIProvider[];
};

export default function CreateApiKeyDialog({ open, onOpenChange, editing, onDataSaved, providers }: Props) {
    const queryClient = useQueryClient();

    const form = useForm<CredentialCreateFormValues>({
        resolver: zodResolver(credentialCreateFormSchema),
        defaultValues: {
            label: '',
            providerId: '',
            apiKey: '',
        },
    });

    const saveMutation = useMutation({
        mutationFn: credentialService.save,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["credentials"] });
            toast.success("API Key creada exitosamente");
            onDataSaved?.(data);
            onOpenChange(false);
            form.reset();
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ??
                "Error al crear la API Key"
            );
        },
    });

    async function onSubmit(values: CredentialCreateFormValues) {
        saveMutation.mutate(values);
    }

    const selectedProviderId = useWatch({
        control: form.control,
        name: "providerId",
    });

    const selectedProvider = useMemo(() => {
        return providers.find((provider) => provider.id === selectedProviderId);
    }, [selectedProviderId, providers]);

    useEffect(() => {
        if (editing) {
            form.reset({
                providerId: editing.providerId,
                label: editing.label,
                apiKey: ''
            });
        }
    }, [editing, form]);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-110" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{editing ? "Editar API Key" : "Añadir API Key"}</DialogTitle>
                    <DialogDescription>{editing ? "Actualiza la clave o cambia el nombre para identificarla." : "Selecciona un proveedor y registra una nueva credencial."}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-5 py-2">
                    <div className="flex flex-col gap-2">
                        <Controller
                            control={form.control}
                            name="providerId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Proveedor</FieldLabel>
                                    <Select
                                        {...field}
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            form.resetField("apiKey");
                                            form.resetField("label", {
                                                defaultValue: selectedProvider?.name || ''
                                            });
                                            form.trigger();
                                        }}
                                    >
                                        <SelectTrigger id="provider"><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
                                        <SelectContent>
                                            {providers.map((provider) => (
                                                <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                        <p className="text-xs text-muted-foreground">{selectedProvider?.description}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Controller
                            control={form.control}
                            name="label"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Nombre</FieldLabel>
                                    <Input
                                        {...field}
                                        id="label"
                                        placeholder={`${selectedProvider?.name || 'My API Key'}`}
                                        autoComplete="off"
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Controller
                            control={form.control}
                            name="apiKey"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>API Key</FieldLabel>
                                    <Input
                                        {...field}
                                        id="api-key"
                                        type="password"
                                        placeholder="Pega tu API key"
                                        autoComplete="new-password"
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                        <p className="text-xs text-muted-foreground">La clave no se mostrará después de guardarla.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? <><Loader className="animate-spin" />Guardando</> : "Guardar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
