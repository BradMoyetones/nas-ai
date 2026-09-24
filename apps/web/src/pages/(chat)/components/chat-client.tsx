'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { AICategory } from '@nas/shared';
import type { ConversationWithMessages } from '@/services/conversation';
import { emitConversationTitle, emitNewConversation } from '@/stores/chat-store';
import { refreshAccessToken } from '@/lib/axios';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';

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

    const conversationIdRef = useRef(conversationId);
    const selectedModelRef = useRef(selectedModel);
    const navigateRef = useRef(navigate);

    useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
    useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

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

    const {
        messages,
        sendMessage,
        setMessages,
        status,
        stop,
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
        onError: (err) => {
            console.error('[chat] Error:', err);
        },
    });

    const isStreaming = status === 'streaming' || status === 'submitted';

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

    const handleSubmit = (text: string) => {
        sendMessage({ text });
    };

    return (
        <div className="relative flex-1 flex flex-col p-4 pb-0 max-w-4xl mx-auto w-full">
            <MessageList 
                messages={messages} 
                isStreaming={isStreaming} 
                isLoadingConversation={isLoadingConversation} 
            />
            <ChatInput 
                onSubmit={handleSubmit}
                status={status}
                onStop={stop}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                modelsCategories={modelsCategories}
            />
        </div>
    );
}
