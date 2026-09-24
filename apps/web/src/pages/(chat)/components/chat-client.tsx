'use client';

import { TypewriterPhrases } from '@/components/typewriter-phrases';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from 'cn';
import { ArrowRight, Brain, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Message as MsgComponent, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useNavigate } from 'react-router';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AICategory } from '@nas/shared';
import type { ConversationWithMessages } from '@/services/conversation';
import { emitConversationTitle, emitNewConversation } from '@/stores/chat-store';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { Loader } from '@/components/loader';
import { refreshAccessToken } from '@/lib/axios';
import {
    identifyModel,
    resolveModelIcon,
} from "@/components/icons/ai";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

interface ChatClientProps {
    conversationId?: string | null;
    initialConversation?: ConversationWithMessages | null;
    isLoadingConversation?: boolean;
    modelsCategories: AICategory[];
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ChatClient({
    conversationId: initialConvId,
    initialConversation,
    isLoadingConversation,
    modelsCategories,
}: ChatClientProps) {
    const [value, setValue] = useState('');
    const navigate = useNavigate();
    const firstModelId = modelsCategories[0]?.models[0]?.id || 'openai/gpt-oss-120b';
    const [selectedModel, setSelectedModel] = useState<string>(firstModelId);
    const [conversationId, setConversationId] = useState<string | undefined>(initialConvId ?? undefined);
    const bottomRef = useRef<HTMLDivElement>(null);

    /*
     * ============================================================
     * Refs estables para closures dentro del transport
     * ============================================================
     *
     * El transport se crea una sola vez (useMemo) y los callbacks
     * necesitan acceder al estado más reciente sin re-crear el hook.
     * Los refs se actualizan en useEffect (no durante render)
     * para cumplir con las reglas de React 19.
     */

    const conversationIdRef = useRef(conversationId);
    const selectedModelRef = useRef(selectedModel);
    const navigateRef = useRef(navigate);

    useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
    useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    /*
     * ============================================================
     * Transport (instancia estable)
     * ============================================================
     *
     * DefaultChatTransport extiende HttpChatTransport.
     * Configura: api, credentials, fetch (auth retry + headers),
     * y prepareSendMessagesRequest (transforma body).
     */

    const transport = useMemo(() => {
        // eslint-disable-next-line react-hooks/refs
        return new DefaultChatTransport<UIMessage>({
            api: `${API_URL}/api/chat`,
            credentials: 'include',

            /*
             * Custom fetch: maneja auth retry (401 → refreshAccessToken → retry)
             * y lee headers de respuesta para metadata de conversación.
             */
            fetch: async (url, init) => {
                let authRetry = false;

                const doRequest = async (): Promise<Response> => {
                    const res = await fetch(url, init);

                    if (res.status === 401 && !authRetry) {
                        authRetry = true;
                        await refreshAccessToken();
                        return doRequest();
                    }

                    return res;
                };

                const response = await doRequest();

                const newConvId = response.headers.get('X-Conversation-Id');
                const isNew = response.headers.get('X-Is-New-Conversation') === '1';

                if (newConvId && isNew) {
                    setConversationId(newConvId);
                    navigateRef.current(`/${newConvId}`, { replace: true });
                    emitNewConversation();
                }

                return response;
            },

            /*
             * Transforma el body del SDK ({ messages, chatId, ... })
             * al formato que nuestro backend espera
             * ({ content, conversationId, modelId }).
             */
            prepareSendMessagesRequest: ({ messages: uiMessages }) => {
                const lastMessage = uiMessages[uiMessages.length - 1];
                const userContent = lastMessage?.parts
                    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map((p) => p.text)
                    .join('') ?? '';

                return {
                    body: {
                        content: userContent,
                        conversationId: conversationIdRef.current,
                        modelId: selectedModelRef.current,
                    },
                };
            },
        });
    }, []);

    /*
     * ============================================================
     * AI SDK useChat hook
     * ============================================================
     */

    const {
        messages,
        sendMessage,
        setMessages,
        status,
        stop,
    } = useChat({
        transport,
        
        onFinish: () => {
            /*
             * Cuando termina la generación, re-fetch la conversación
             * para obtener el título actualizado (se genera en background).
             */
            const convId = conversationIdRef.current;
            if (convId) {
                fetch(`${API_URL}/api/conversations/${convId}`, { credentials: 'include' })
                    .then((res) => res.json())
                    .then((data) => {
                        if (data?.conversation?.title && data.conversation.title !== 'New conversation') {
                            emitConversationTitle(convId, data.conversation.title);
                        }
                    })
                    .catch(() => { /* silently ignore */ });
            }
        },

        onError: (err) => {
            console.error('[chat] Error:', err);
        },
    });

    const isStreaming = status === 'streaming' || status === 'submitted';

    useAutoScroll({
        bottomRef,
        dependencies: [messages, isStreaming],
    });

    /*
     * ============================================================
     * Inicializar mensajes desde conversación existente
     * ============================================================
     */

    useEffect(() => {
        if (initialConversation) {
            const uiMessages: UIMessage[] = initialConversation.messages.map((msg, i) => ({
                id: msg.id || `msg-${i}`,
                role: msg.role as 'user' | 'assistant',
                parts: [{ type: 'text' as const, text: msg.content }],
                createdAt: new Date(msg.createdAt),
            }));

            setMessages(uiMessages);
        } else if (!initialConvId) {
            setMessages([]);
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConversationId(initialConvId ?? undefined);
    }, [initialConversation, initialConvId, setMessages]);

    /*
     * ============================================================
     * Submit handler
     * ============================================================
     */

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!value.trim() || isStreaming) {
            return;
        }

        bottomRef.current?.scrollIntoView({
            behavior: 'smooth',
        });

        const currentContent = value.trim();
        setValue('');

        sendMessage({ text: currentContent });
    };

    /*
     * ============================================================
     * Model helpers
     * ============================================================
     */

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

    /*
     * ============================================================
     * Extraer texto de UIMessage
     * ============================================================
     */

    const getMessageText = (msg: UIMessage): string => {
        return msg.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('') ?? '';
    };

    return (
        <div className="relative flex-1 flex flex-col p-4 pb-0 max-w-4xl mx-auto w-full">
            {isLoadingConversation ? (
                <div className="flex-1 flex flex-col justify-center items-center">
                    <Loader />
                </div>
            ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center">
                    <TypewriterPhrases />
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-6 pb-10">
                    {messages.map((m, i) => {
                        const isLastMessage = i === messages.length - 1;
                        const isLastAssistant = isLastMessage && m.role === 'assistant';
                        const content = getMessageText(m);

                        return (
                            <MsgComponent key={m.id || i} from={m.role}>
                                <MessageContent>
                                    {m.role === 'user' ? (
                                        content
                                    ) : (
                                        <MessageResponse parseIncompleteMarkdown={isStreaming && isLastAssistant}>
                                            {content || ' '}
                                        </MessageResponse>
                                    )}
                                </MessageContent>
                            </MsgComponent>
                        );
                    })}
                </div>
            )}

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
                                                onValueChange={setSelectedModel}
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
                                        onClick={() => stop()}
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

            <div ref={bottomRef} />
        </div>
    );
}
