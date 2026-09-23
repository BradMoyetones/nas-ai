'use client';

import { TypewriterPhrases } from '@/components/typewriter-phrases';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from 'cn';
import { AlertCircle, ArrowRight, Brain, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import type { Message, MessageMetadata } from '@/types/models';
import type { AICategory } from '@/services/ai';
import type { ConversationWithMessages } from '@/services/conversation';
import { useChatStore, emitConversationTitle, emitNewConversation } from '@/stores/chat-store';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Loader } from '@/components/loader';
import type { ChatStreamEvent } from '@/services/ai/types';
import { refreshAccessToken } from '@/lib/axios';
import {
    identifyModel,
    resolveModelIcon,
} from "@/components/icons/ai";

interface ChatClientProps {
    conversationId?: string;
    initialConversation?: ConversationWithMessages;
    isLoadingConversation?: boolean;
    modelsCategories: AICategory[];
}

type SseEventData<E extends ChatStreamEvent['event']> = Extract<ChatStreamEvent, { event: E }>['data'];

function parseSseData<T>(data: string): T {
    try {
        return JSON.parse(data) as T;
    } catch (error) {
        throw new Error(`Invalid SSE payload: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
}

export default function ChatClient({
    conversationId: initialConvId,
    initialConversation,
    isLoadingConversation,
    modelsCategories,
}: ChatClientProps) {
    const [value, setValue] = useState('');
    const navigate = useNavigate();
    const {
        messages,
        isStreaming,
        setConversationId,
        setMessages,
        addMessage,
        updateLastMessage,
        setIsStreaming,
        abortStream,
    } = useChatStore();
    const firstModelId = modelsCategories[0]?.models[0]?.id || 'openai/gpt-oss-120b';
    const [selectedModel, setSelectedModel] = useState<string>(firstModelId);
    const bottomRef = useRef<HTMLDivElement>(null);
    const serverGenerationErrorRef = useRef(false);

    useAutoScroll({
        bottomRef,
        dependencies: [messages, isStreaming],
    });

    useEffect(() => {
        const currentState = useChatStore.getState();

        if (initialConvId && currentState.conversationId === initialConvId && currentState.messages.length > 0) {
            return;
        }

        if (initialConversation) {
            const convs = initialConversation.messages.map(({ role, content, metadata }) => ({
                role,
                content,
                metadata: metadata ?? null,
            }));

            setMessages(convs);
        } else {
            setMessages([]);
        }

        setConversationId(initialConvId);
        serverGenerationErrorRef.current = false;
    }, [initialConversation, initialConvId, setMessages, setConversationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!value.trim() || isStreaming) {
            return;
        }

        bottomRef.current?.scrollIntoView({
            behavior: 'smooth',
        });

        serverGenerationErrorRef.current = false;

        const currentContent = value.trim();

        const userMessage: Pick<Message, 'role' | 'content'> = {
            role: 'user',
            content: currentContent,
        };

        addMessage(userMessage);
        setValue('');
        setIsStreaming(true);

        addMessage({
            role: 'assistant',
            content: '',
        });

        const API_URL = import.meta.env.VITE_API_URL || '';

        let assistantContent = '';
        let currentConversationId = useChatStore.getState().conversationId;

        let authRetry = false;

        try {
            await fetchEventSource(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: currentContent,
                    conversationId: currentConversationId,
                    modelId: selectedModel,
                }),
                signal: useChatStore.getState().abortController?.signal,
                openWhenHidden: true,
                async onopen(response) {
                    if (response.status === 401) {
                        if (authRetry) {
                            throw new Error('Authentication failed after token refresh.');
                        }
                        authRetry = true;
                        await refreshAccessToken();
                        throw new Error('AUTH_REFRESH_RETRY');
                    }

                    if (!response.ok) {
                        throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
                    }

                    const contentType = response.headers.get('content-type') ?? '';

                    if (!contentType.toLowerCase().includes('text/event-stream')) {
                        throw new Error(`Expected SSE response, received: ${contentType || 'unknown content type'}`);
                    }

                    authRetry = false;
                },

                onmessage(ev) {
                    if (ev.event === 'conversation.created') {
                        const data = parseSseData<SseEventData<'conversation.created'>>(ev.data);
                        setConversationId(data.id);
                        currentConversationId = data.id;

                        navigate(`/${data.id}`, {
                            replace: true,
                        });

                        emitNewConversation();
                        return;
                    }

                    if (ev.event === 'conversation.title') {
                        const data = parseSseData<SseEventData<'conversation.title'>>(ev.data);
                        emitConversationTitle(data.id, data.title);

                        return;
                    }

                    if (ev.event === 'message.delta') {
                        const data = parseSseData<SseEventData<'message.delta'>>(ev.data);

                        if (!data.content) {
                            return;
                        }

                        assistantContent += data.content;

                        const currentMessages = useChatStore.getState().messages;
                        const lastMessage = currentMessages[currentMessages.length - 1];

                        if (lastMessage?.role === 'assistant') {
                            updateLastMessage(assistantContent);
                        } else {
                            addMessage({
                                role: 'assistant',
                                content: assistantContent,
                            });
                        }

                        return;
                    }

                    if (ev.event === 'message.completed') {
                        return;
                    }

                    if (ev.event === 'message.error') {
                        const data = parseSseData<SseEventData<'message.error'>>(ev.data);
                        serverGenerationErrorRef.current = true;

                        const metadata: MessageMetadata = {
                            type: 'generation_error',
                            code: data.code,
                            provider: data.provider,
                            modelId: data.model,
                            retryable: data.retryable,
                            ...(data.status !== undefined ? { status: data.status } : {}),
                        };

                        const content = assistantContent.trim() ? assistantContent : data.message;
                        updateLastMessage(content, metadata);
                        return;
                    }

                    if (ev.event === 'generation.done') {
                        const data = parseSseData<SseEventData<'generation.done'>>(ev.data);
                        setIsStreaming(false);

                        if (data.status === 'success') {
                            serverGenerationErrorRef.current = false;
                        }
                        return;
                    }

                    console.warn('[chat] Unknown SSE event:', ev.event, ev.data);
                },

                onclose() {
                    setIsStreaming(false);
                },

                onerror(err) {
                    console.error('[chat] FetchEventSource error:', err);

                    if (serverGenerationErrorRef.current) {
                        throw err;
                    }

                    /*
                     * Si el error fue producido por nuestro 401,
                     * fetchEventSource volverá a ejecutar la petición.
                     */
                    if (err instanceof Error && err.message === 'AUTH_REFRESH_RETRY') {
                        return;
                    }

                    const transportMessage = 'Se perdió la conexión con el servidor durante la generación.';

                    const metadata: MessageMetadata = {
                        type: 'generation_error',
                        code: 'STREAM_CONNECTION_ERROR',
                        provider: 'google',
                        modelId: selectedModel,
                        retryable: true,
                    };

                    if (!assistantContent.trim()) {
                        updateLastMessage(transportMessage, metadata);
                    } else {
                        updateLastMessage(assistantContent, metadata);
                    }

                    setIsStreaming(false);

                    throw err;
                },
            });
        } catch (error) {
            const aborted = useChatStore.getState().abortController?.signal.aborted;

            if (aborted) {
                setIsStreaming(false);
                return;
            }

            console.error('[chat] Request failed:', error);

            setIsStreaming(false);
        }
    };

    const getCurrentModelData = () => {
        for (const cat of modelsCategories) {
            const model = cat.models.find((m) => m.id === selectedModel);

            if (model) {
                return model;
            }
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
                        const generationError =
                            isLastAssistant && m.metadata?.type === 'generation_error' ? m.metadata : null;

                        return (
                            <MsgComponent key={i} from={m.role}>
                                <MessageContent>
                                    {m.role === 'user' ? (
                                        m.content
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <MessageResponse parseIncompleteMarkdown={isStreaming && isLastAssistant}>
                                                {m.content || ' '}
                                            </MessageResponse>

                                            {generationError && (
                                                <div
                                                    className={cn(
                                                        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                                                        'border-destructive/20 bg-destructive/5 text-muted-foreground'
                                                    )}
                                                >
                                                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="font-medium text-foreground">
                                                            No se pudo completar la respuesta
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                                            <span>{generationError.code}</span>
                                                            {generationError.status !== undefined && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span>Error {generationError.status}</span>
                                                                </>
                                                            )}
                                                            {generationError.retryable && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span>Puede reintentarse</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                                        onClick={() => abortStream()}
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
