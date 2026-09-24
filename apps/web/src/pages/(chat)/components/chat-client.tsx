'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { AICategory } from '@nas/shared';
import type { ConversationWithMessages } from '@/services/conversation';
import { emitConversationTitle, emitNewConversation } from '@/stores/chat-store';
import { refreshAccessToken } from '@/lib/axios';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage, FileUIPart } from 'ai';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { ConversationConfig } from './conversation-config';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

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
    const navigate = useNavigate();
    const firstModelId = modelsCategories[0]?.models[0]?.id || 'openai/gpt-oss-120b';
    const [selectedModel, setSelectedModel] = useState<string>(firstModelId);
    const [conversationId, setConversationId] = useState<string | undefined>(initialConvId ?? undefined);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const conversationIdRef = useRef(conversationId);
    const selectedModelRef = useRef(selectedModel);
    const navigateRef = useRef(navigate);

    useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
    useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    const queryClient = useQueryClient();
    const { mutate: updateConfig, isPending: isUpdatingConfig } = useMutation({
        mutationFn: async ({ id, systemPrompt, defaultModel }: { id: string, systemPrompt: string, defaultModel: string }) => {
            const res = await apiClient.patch(`/api/conversations/${id}`, { systemPrompt, defaultModel });
            return res.data;
        },
        onSuccess: () => {
            if (conversationId) {
                queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
            }
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });

    const handleSaveConfig = (systemPrompt: string, defaultModel: string) => {
        if (!conversationId) return;
        updateConfig({ id: conversationId, systemPrompt, defaultModel });
    };

    /*
     * Scroll sentinel — vive DEBAJO del ChatInput (sticky)
     * para que el auto-scroll siempre lleve al fondo real.
     */
    const bottomRef = useRef<HTMLDivElement>(null);

    const transport = useMemo(() => {
        // eslint-disable-next-line react-hooks/refs
        return new DefaultChatTransport<UIMessage>({
            api: `${API_URL}/api/chat`,
            credentials: 'include',
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
            prepareSendMessagesRequest: ({ messages: uiMessages }) => {
                const lastMessage = uiMessages[uiMessages.length - 1];
                const userContent = lastMessage?.parts
                    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map((p) => p.text)
                    .join('') ?? '';

                const fileParts = lastMessage?.parts
                    ?.filter((p) => p.type === 'file');

                return {
                    body: {
                        content: userContent,
                        conversationId: conversationIdRef.current,
                        modelId: selectedModelRef.current,
                        ...(fileParts?.length ? { files: fileParts } : {}),
                    },
                };
            },
        });
    }, []);

    const {
        messages,
        sendMessage,
        setMessages,
        status,
        stop,
        error,
    } = useChat({
        transport,
        onFinish: () => {
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
    });

    const isStreaming = status === 'streaming' || status === 'submitted';

    useAutoScroll({
        bottomRef,
        dependencies: [messages, isStreaming, error],
    });

    useEffect(() => {
        if (initialConversation) {
            const uiMessages: UIMessage[] = initialConversation.messages.map((msg, i) => ({
                id: msg.id || `msg-${i}`,
                role: msg.role as 'user' | 'assistant',
                parts: [{ type: 'text' as const, text: msg.content }],
                createdAt: new Date(msg.createdAt),
                metadata: {
                    promptTokens: msg.promptTokens ?? undefined,
                    completionTokens: msg.completionTokens ?? undefined,
                    totalTokens: msg.totalTokens ?? undefined,
                    reasoningTokens: msg.reasoningTokens ?? undefined,
                    durationMs: msg.durationMs ?? undefined,
                },
            }));

            setMessages(uiMessages);
        } else if (!initialConvId) {
            setMessages([]);
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConversationId(initialConvId ?? undefined);
    }, [initialConversation, initialConvId, setMessages]);

    const handleSubmit = (text: string, files?: FileUIPart[]) => {
        if (files?.length) {
            sendMessage({ text, files });
        } else {
            sendMessage({ text });
        }
    };

    const handleRetry = () => {
        // Reenvía el último mensaje del usuario
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            const textContent = lastUserMessage.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map(p => p.text)
                .join('');

            if (textContent) {
                sendMessage({ text: textContent });
            }
        }
    };

    return (
        <div className="relative flex-1 flex flex-col p-4 pb-0 max-w-4xl mx-auto w-full">
            {conversationId && (
                <div className="absolute bottom-16 right-7 z-50">
                    <Button variant="outline" size="icon-sm" className="shrink-0" onClick={() => setIsConfigOpen(true)}>
                        <Settings className="size-4" />
                        <span className="sr-only">Configuración de la conversación</span>
                    </Button>
                    <ConversationConfig
                        conversationId={conversationId}
                        currentSystemPrompt={initialConversation?.systemPrompt}
                        currentDefaultModel={initialConversation?.defaultModel}
                        modelsCategories={modelsCategories}
                        onSave={handleSaveConfig}
                        isSaving={isUpdatingConfig}
                        open={isConfigOpen}
                        onOpenChange={setIsConfigOpen}
                    />
                </div>
            )}
            <MessageList
                messages={messages}
                isStreaming={isStreaming}
                isLoadingConversation={isLoadingConversation}
                error={error}
                onRetry={handleRetry}
            />
            <ChatInput
                onSubmit={handleSubmit}
                status={status}
                onStop={stop}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                modelsCategories={modelsCategories}
            />
            {/* Scroll sentinel — DEBAJO del input sticky para que scroll llegue al fondo real */}
            <div ref={bottomRef} />
        </div>
    );
}
