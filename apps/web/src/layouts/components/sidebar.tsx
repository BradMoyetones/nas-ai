'use client';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, MoreHorizontal, Trash2, User, LogOut, Settings as SettingsIcon, Pencil, Check, X as XIcon, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { apiClient, conversationService } from '@/lib/axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Loader } from '@/components/loader';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { useConversationStore } from '@/stores/conversation-store';

interface Conversation {
    id: string;
    title: string;
    createdAt: string;
}

export function AppSidebar() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { titleUpdates, invalidationKey } = useConversationStore();
    const queryClient = useQueryClient();
    const location = useLocation();
    const { isMobile } = useSidebar();
    const params = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['conversations', { search: debouncedSearch }],
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams();
            params.set('limit', '20');
            if (pageParam) params.set('cursor', pageParam);
            if (debouncedSearch) params.set('search', debouncedSearch);
            const response = await apiClient.get<{ conversations: Conversation[]; nextCursor: string | null }>(`/api/conversations?${params}`);
            return response.data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

    // Refetch when invalidation key changes (new conversation)
    useEffect(() => {
        if (invalidationKey > 0) refetch();
    }, [invalidationKey, refetch]);

    // Flatten pages into single list
    const conversations = useMemo(() => {
        const items = data?.pages.flatMap((p) => p.conversations) ?? [];
        // Apply title updates from store
        return items.map((c) => ({
            ...c,
            title: titleUpdates[c.id] ?? c.title,
        }));
    }, [data, titleUpdates]);

    // Infinite scroll observer
    const loadMoreRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const { mutateAsync: deleteConversation } = useMutation({
        mutationFn: (id: string) => conversationService.delete(id),
        onSuccess: (data, id) => {
            toast.success(data.message);
            // Invalidate the query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            if (params.conversationId === id) {
                navigate('/');
            }
        },
        onError: () => {
            toast.error('Error al eliminar conversación');
        }
    });

    const { mutateAsync: renameConversation, isPending: isRenaming } = useMutation({
        mutationFn: ({ id, title }: { id: string, title: string }) =>
            apiClient.patch(`/api/conversations/${id}`, { title }),
        onSuccess: (_, { id, title }) => {
            useConversationStore.getState().updateTitle(id, title);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setEditingId(null);
        },
        onError: () => {
            toast.error('Error al renombrar conversación');
        }
    });

    const startEditing = useCallback((conv: Conversation) => {
        setEditingId(conv.id);
        setEditTitle(conv.title);
        // Focus + select after React renders the input
        requestAnimationFrame(() => {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        });
    }, []);

    const cancelEditing = useCallback(() => {
        if (isRenaming) return;
        setEditingId(null);
        setEditTitle('');
    }, [isRenaming]);

    const handleRename = useCallback(() => {
        if (!editingId || isRenaming) return;
        const trimmed = editTitle.trim();
        if (!trimmed) {
            cancelEditing();
            return;
        }
        // Find the original title to avoid unnecessary API call
        const original = conversations.find(c => c.id === editingId);
        if (original && trimmed === original.title) {
            cancelEditing();
            return;
        }
        renameConversation({ id: editingId, title: trimmed });
    }, [editingId, editTitle, isRenaming, conversations, renameConversation, cancelEditing]);

    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                    <Link to="/">
                        <Plus className="h-4 w-4" />
                        Nueva Conversación
                    </Link>
                </Button>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarGroupLabel>Historial</SidebarGroupLabel>
                    <div className="px-2 pb-2">
                        <Input
                            placeholder="Buscar conversaciones..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <SidebarMenu className="gap-1">
                        {isLoading ? (
                            <div className="flex justify-center p-4">
                                <Loader />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="px-2 text-sm text-muted-foreground text-center py-4">
                                No hay conversaciones
                            </div>
                        ) : (
                            <>
                                {conversations.map((conv) => {
                                    const isEditing = editingId === conv.id;

                                    return (
                                        <SidebarMenuItem key={conv.id}>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleRename();
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        onBlur={cancelEditing}
                                                        disabled={isRenaming}
                                                        className='h-9!'
                                                    />
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={handleRename}
                                                        disabled={isRenaming}
                                                        className="shrink-0 p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
                                                    >
                                                        {isRenaming ? (
                                                            <LoaderCircle className="size-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="size-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={cancelEditing}
                                                        disabled={isRenaming}
                                                        className="shrink-0 p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
                                                    >
                                                        <XIcon className="size-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <SidebarMenuButton asChild isActive={location.pathname === `/${conv.id}`}>
                                                        <Link to={`/${conv.id}`}>
                                                            <MessageSquare className="shrink-0" />
                                                            <span className="truncate">{conv.title}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <SidebarMenuAction showOnHover>
                                                                <MoreHorizontal />
                                                                <span className="sr-only">More</span>
                                                            </SidebarMenuAction>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            side={isMobile ? 'bottom' : 'right'}
                                                            align={isMobile ? 'end' : 'start'}
                                                        >
                                                            <DropdownMenuItem onClick={() => startEditing(conv)}>
                                                                <Pencil />
                                                                <span>Cambiar nombre</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => deleteConversation(conv.id)} variant='destructive'>
                                                                <Trash2 />
                                                                <span>Eliminar</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </>
                                            )}
                                        </SidebarMenuItem>
                                    );
                                })}
                                <div ref={loadMoreRef} className="h-4" />
                                {isFetchingNextPage && (
                                    <div className="flex justify-center p-2">
                                        <Loader />
                                    </div>
                                )}
                            </>
                        )}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size={'lg'}
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage alt={user!.username} />
                                        <AvatarFallback className="rounded-lg">{user!.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user!.username}</span>
                                        <span className="truncate text-xs">{user!.email}</span>
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side={isMobile ? 'bottom' : 'right'}
                                align="end"
                                className="w-56"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user!.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user!.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/settings/profile">
                                        <User />
                                        <span>Perfil</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link to="/settings">
                                        <SettingsIcon />
                                        <span>Configuración</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} variant="destructive">
                                    <LogOut />
                                    <span>Cerrar sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
