"use client"

import { useMemo, useState } from "react"
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, KeyRound, Loader2, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { credentialService, providersService } from "@/lib/axios"
import type { CredentialCreateFormValues, ProviderCredentialInfo } from "@/services/credential"
import type { AIProviderId } from "@nas/shared"

function CredentialsPage() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [providerId, setProviderId] = useState("")
    const [label, setLabel] = useState("")
    const [apiKey, setApiKey] = useState("")

    const queryClient = useQueryClient()

    const { data: credentials } = useQuery({
        queryKey: ['credentials'],
        queryFn: async () => {
            try {
                const res = await credentialService.list()
                return res
            } catch (error) {
                console.error(error)
                return []
            }
        }
    })

    const { data: providers } = useQuery({
        queryKey: ['providers'],
        queryFn: async () => {
            try {
                const res = await providersService.list()
                return res
            } catch (error) {
                console.error(error)
                return []
            }
        }
    })

    const providerMap = useMemo(() => new Map(providers?.map((provider) => [provider.id, provider])), [providers])
    const selectedProvider = providerMap.get(providerId as any) ?? providers?.[0]

    const editingCredential = credentials?.find((credential) => credential.id === editingId)

    const saveMutation = useMutation({
        mutationFn: (data: CredentialCreateFormValues) => credentialService.save(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credentials'] })
            setDialogOpen(false)
            setApiKey("")
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (providerId: string) => credentialService.remove(providerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credentials'] })
        }
    })

    function openCreate() {
        const firstAvailable = providers.find((provider) => !credentials.some((credential) => credential.providerId === provider.id)) ?? providers[0]
        setEditingId(null)
        setProviderId(firstAvailable.id)
        setLabel(firstAvailable.name)
        setApiKey("")
        setDialogOpen(true)
    }

    function openEdit(credential: ProviderCredentialInfo) {
        setEditingId(credential.id)
        setProviderId(credential.providerId)
        setLabel(credential.label ?? providerMap.get(credential.providerId as AIProviderId)?.name ?? "")
        setApiKey("")
        setDialogOpen(true)
    }

    function handleProviderChange(value: string) {
        setProviderId(value)
        if (!editingCredential) setLabel(providerMap.get(value as AIProviderId)?.name ?? "")
    }

    function handleSubmit() {
        if (!apiKey.trim() || !label.trim()) return
        saveMutation.mutate({ providerId, label: label.trim(), apiKey })
    }

    return (
        <main className="p-4 w-full">
            <header className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Configuración</p>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight">Claves de API</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Administra las credenciales de tus proveedores de IA.</p>
                </div>
                <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Añadir API Key</Button>
            </header>

            <section aria-labelledby="credentials-heading" className="rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
                    <div>
                        <h2 id="credentials-heading" className="text-sm font-medium">Credenciales registradas</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">Las claves se almacenan de forma segura y nunca se muestran completas.</p>
                    </div>
                    <KeyRound className="hidden size-4 text-muted-foreground sm:block" />
                </div>

                {credentials.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {credentials.map((credential) => {
                                const provider = providerMap.get(credential.providerId as AIProviderId) ?? providers[0]
                                const isDeleting = deleteMutation.isPending && deleteMutation.variables === credential.id
                                return (
                                    <TableRow key={credential.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex size-7 items-center justify-center rounded-md border bg-muted/50 text-[10px] font-semibold">{provider.name.slice(0, 2).toUpperCase()}</div>
                                                <span className="font-medium">{provider.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{credential.label || provider.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={credential.isValid ? "secondary" : "destructive"} className="font-normal">
                                                {credential.isValid ? <Check data-icon="inline-start" /> : <XCircle data-icon="inline-start" />}
                                                {credential.isValid ? "Activa" : "Revisar"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${provider.name}`} disabled={isDeleting}>
                                                        {isDeleting ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(credential)}><Pencil data-icon="inline-start" />Editar</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate(credential.id)}><Trash2 data-icon="inline-start" />Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                ) : (
                    <Empty className="border-0 py-16">
                        <EmptyHeader>
                            <EmptyMedia variant="icon"><KeyRound /></EmptyMedia>
                            <EmptyTitle className="text-base">No hay claves registradas</EmptyTitle>
                            <EmptyDescription>Añade una API key para usar tus propios límites y modelos.</EmptyDescription>
                        </EmptyHeader>
                        <Button size="sm" onClick={openCreate}><Plus data-icon="inline-start" />Añadir API Key</Button>
                    </Empty>
                )}
            </section>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Tus claves solo se utilizan para realizar solicitudes en tu nombre.</div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Editar API Key" : "Añadir API Key"}</DialogTitle>
                        <DialogDescription>{editingId ? "Actualiza la clave o cambia el nombre para identificarla." : "Selecciona un proveedor y registra una nueva credencial."}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-5 py-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="provider">Proveedor</Label>
                            <Select value={providerId} onValueChange={handleProviderChange} disabled={Boolean(editingId)}>
                                <SelectTrigger id="provider"><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
                                <SelectContent>{providers.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="label">Nombre</Label>
                            <Input id="label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={selectedProvider.name} autoComplete="off" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={editingId ? "Pega una nueva clave para actualizar" : "Pega tu API key"} autoComplete="new-password" />
                            <p className="text-xs text-muted-foreground">La clave no se mostrará después de guardarla.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={saveMutation.isPending || !apiKey.trim() || !label.trim()}>
                            {saveMutation.isPending ? <><Loader2 className="animate-spin" data-icon="inline-start" />Guardando</> : "Guardar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}

export default function Page() {
    const [queryClient] = useState(() => new QueryClient())
    return (
        <QueryClientProvider client={queryClient}>
            <CredentialsPage />
        </QueryClientProvider>
    )
}

