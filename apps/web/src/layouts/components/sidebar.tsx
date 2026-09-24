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
import { Plus, MessageSquare, MoreHorizontal, Trash2, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient, conversationService } from '@/lib/axios';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Loader } from '@/components/loader';
import { useMutation } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';

interface Conversation {
    id: string;
    title: string;
    createdAt: string;
}

export function AppSidebar() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const { isMobile } = useSidebar()
    const params = useParams()
    const navigate = useNavigate()
    const { user, logout } = useAuth()

    async function loadConversations() {
        try {
            const response = await apiClient.get<{ conversations: Conversation[] }>('/api/conversations');
            if (response && response.data.conversations) {
                setConversations(response.data.conversations);
            }
        } catch (error) {
            console.error('Error loading conversations', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadConversations();

        const handleNewConversation = () => {
            loadConversations();
        };

        const handleConversationTitle = (event: Event) => {
            const customEvent = event as CustomEvent<{
                id: string;
                title: string;
            }>;

            const { id, title } = customEvent.detail;

            setConversations((current) =>
                current.map((conversation) =>
                    conversation.id === id
                        ? {
                            ...conversation,
                            title,
                        }
                        : conversation
                )
            );
        };

        window.addEventListener('chat:new-conversation', handleNewConversation);
        window.addEventListener('chat:conversation-title', handleConversationTitle);

        return () => {
            window.removeEventListener('chat:new-conversation', handleNewConversation);
            window.removeEventListener('chat:conversation-title', handleConversationTitle);
        };
    }, []);

    const { mutateAsync: deleteConversation } = useMutation({
        mutationFn: (id: string) => conversationService.delete(id),
        onSuccess: (data, id) => {
            toast.success(data.message);
            setConversations(prev => prev.filter(conv => conv.id !== id));
            if (params.conversationId === id) {
                navigate('/');
            }
        },
        onError: () => {
            toast.error('Error al eliminar conversación');
        }
    });

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
                    <SidebarMenu className="gap-1">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="px-2 text-sm text-muted-foreground text-center py-4">
                                No hay conversaciones
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <SidebarMenuItem key={conv.id}>
                                    <SidebarMenuButton asChild isActive={location.pathname === `/${conv.id}`}>
                                        <Link to={`/${conv.id}`}>
                                            <MessageSquare className="h-4 w-4 shrink-0" />
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
                                            <DropdownMenuItem onClick={() => deleteConversation(conv.id)} variant='destructive'>
                                                <Trash2 />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </SidebarMenuItem>
                            ))
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
                                        <AvatarImage alt={user.username} />
                                        <AvatarFallback className="rounded-lg">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.username}</span>
                                        <span className="truncate text-xs">{user.email}</span>
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
                                        <p className="text-sm font-medium leading-none">{user.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User />
                                    <span>Perfil</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer w-full">
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
