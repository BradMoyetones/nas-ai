import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { credentialService } from '@/lib/axios';

const PROVIDERS = [
    { id: 'groq', name: 'Groq', description: 'Ultra-fast inference con modelos Open Source', color: 'text-orange-500' },
    { id: 'openrouter', name: 'OpenRouter', description: 'Acceso a múltiples proveedores y modelos gratuitos', color: 'text-purple-500' },
    { id: 'cerebras', name: 'Cerebras', description: 'Inferencia rápida con hardware especializado', color: 'text-blue-500' },
    { id: 'google', name: 'Google AI', description: 'Modelos Gemini con visión y razonamiento', color: 'text-green-500' },
];

export default function ProvidersPage() {
    const queryClient = useQueryClient();
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const { data: credentials = [], isLoading } = useQuery({
        queryKey: ['credentials'],
        queryFn: () => credentialService.list(),
    });

    const saveMutation = useMutation({
        mutationFn: ({ providerId, apiKey }: { providerId: string, apiKey: string }) => 
            credentialService.save(providerId, apiKey),
        onSuccess: (_, variables) => {
            toast.success('Credencial guardada exitosamente');
            setApiKeys(prev => ({ ...prev, [variables.providerId]: '' }));
            queryClient.invalidateQueries({ queryKey: ['credentials'] });
        },
        onError: () => {
            toast.error('Error al guardar credencial');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (providerId: string) => credentialService.remove(providerId),
        onSuccess: () => {
            toast.success('Credencial eliminada exitosamente');
            queryClient.invalidateQueries({ queryKey: ['credentials'] });
        },
        onError: () => {
            toast.error('Error al eliminar credencial');
        }
    });

    const handleSave = (providerId: string) => {
        const apiKey = apiKeys[providerId];
        if (!apiKey) {
            toast.error('Por favor, ingresa una API Key');
            return;
        }
        saveMutation.mutate({ providerId, apiKey });
    };

    const handleDelete = (providerId: string) => {
        deleteMutation.mutate(providerId);
    };

    if (isLoading) {
        return <div className="p-8">Cargando...</div>;
    }

    return (
        <div className="container max-w-4xl py-8">
            <h1 className="text-3xl font-bold mb-8">Configuración de Proveedores</h1>
            <div className="grid gap-6">
                {PROVIDERS.map(provider => {
                    const credential = credentials.find(c => c.providerId === provider.id);
                    const isConfigured = !!credential;

                    return (
                        <Card key={provider.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className={`text-xl ${provider.color}`}>{provider.name}</CardTitle>
                                        <CardDescription className="mt-1">{provider.description}</CardDescription>
                                    </div>
                                    <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-600 hover:bg-green-700" : ""}>
                                        {isConfigured ? 'Configurada' : 'Sin configurar'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor={`apikey-${provider.id}`}>API Key</Label>
                                        <Input
                                            id={`apikey-${provider.id}`}
                                            type="password"
                                            placeholder={`Ingresa tu API Key de ${provider.name}`}
                                            value={apiKeys[provider.id] || ''}
                                            onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                            disabled={saveMutation.isPending && saveMutation.variables?.providerId === provider.id}
                                        />
                                    </div>
                                    <Button 
                                        onClick={() => handleSave(provider.id)}
                                        disabled={saveMutation.isPending && saveMutation.variables?.providerId === provider.id}
                                    >
                                        Guardar
                                    </Button>
                                    {isConfigured && (
                                        <Button 
                                            variant="destructive"
                                            onClick={() => handleDelete(provider.id)}
                                            disabled={deleteMutation.isPending && deleteMutation.variables === provider.id}
                                        >
                                            Eliminar
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
