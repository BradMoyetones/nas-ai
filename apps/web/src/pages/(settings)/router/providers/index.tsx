"use client"

import { useMemo, useState } from "react"
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, KeyRound, Loader2, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { credentialService, providersService } from "@/lib/axios"
import type { ProviderCredentialInfo } from "@/services/credential"
import type { AIProviderId } from "@nas/shared"
import CreateApiKeyDialog from "./components/create"
import { resolveModelIcon, type ModelIconContext, type ProviderId } from "@/components/icons/ai"

function CredentialsPage() {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<ProviderCredentialInfo | null>(null)

    const queryClient = useQueryClient()

    const { data: credentials = [], isLoading: isLoadingCreds } = useQuery({
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

    const { data: providers = [], isLoading: isLoadingProviders } = useQuery({
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

    const isLoading = isLoadingCreds || isLoadingProviders

    // 2. Memoización segura, `providers` siempre será un array gracias al default
    const providerMap = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers])

    const deleteMutation = useMutation({
        mutationFn: (id: string) => credentialService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credentials'] })
        }
    })

    if (isLoading) {
        return (
            <main className="flex w-full h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-sm">Cargando credenciales...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="p-4 w-full space-y-4">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight">Claves de API</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Administra las credenciales de tus proveedores de IA.</p>
                </div>
                <Button size="sm" onClick={() => setDialogOpen(true)} disabled={providers.length === 0}>
                    <Plus />Añadir API Key
                </Button>
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
                                // Fallback a mock en caso de que la API devuelva una credencial huérfana
                                const provider = providerMap.get(credential.providerId as AIProviderId) || { id: credential.providerId, name: credential.providerId }
                                const isDeleting = deleteMutation.isPending && deleteMutation.variables === credential.id

                                const providerIconMeta: Partial<ModelIconContext> = { provider: credential.providerId as ProviderId };
                                const resolved = resolveModelIcon(providerIconMeta);
                                const Icon = resolved.component;

                                return (
                                    <TableRow key={credential.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex size-7 items-center justify-center rounded-md border bg-muted/50 text-[10px] font-semibold">
                                                    <Icon />
                                                </div>
                                                <span className="font-medium">{provider.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{credential.label || provider.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={credential.isValid ? "secondary" : "destructive"} className="font-normal">
                                                {credential.isValid ? <Check /> : <XCircle />}
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
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditing(credential);
                                                            setDialogOpen(true);
                                                        }}
                                                    >
                                                        <Pencil />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => deleteMutation.mutate(credential.id)}
                                                        variant="destructive"
                                                    >
                                                        <Trash2 />
                                                        Eliminar
                                                    </DropdownMenuItem>
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
                        <Button
                            size="sm"
                            onClick={() => setDialogOpen(true)}
                            disabled={providers.length === 0}
                            type="button"
                            variant="outline"
                        >
                            <Plus />Añadir API Key
                        </Button>
                    </Empty>
                )}
            </section>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Tus claves solo se utilizan para realizar solicitudes a tus proveedores de IA y se almacenan de forma segura.</div>

            <CreateApiKeyDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) setEditing(null)
                }}
                providers={providers}
                onDataSaved={(credential) => {
                    queryClient.setQueryData(["credentials"], (prev: ProviderCredentialInfo[]) => [...prev, credential])
                }}
                editing={editing}
            />
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

