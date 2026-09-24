import { UIMessage } from 'ai';
import { Message as MsgComponent, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { TypewriterPhrases } from '@/components/typewriter-phrases';
import { Loader } from '@/components/loader';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useRef } from 'react';

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
    isLoadingConversation?: boolean;
}

export function MessageList({ messages, isStreaming, isLoadingConversation }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useAutoScroll({
        bottomRef,
        dependencies: [messages, isStreaming],
    });

    return (
        <>
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

                        const textParts = m.parts?.filter((p): p is { type: 'text'; text: string } => p.type === 'text') || [];
                        const reasoningParts = m.parts?.filter((p) => p.type === 'reasoning') || [];
                        
                        const textContent = textParts.map(p => p.text).join('');

                        return (
                            <MsgComponent key={m.id || i} from={m.role}>
                                <MessageContent>
                                    {m.role === 'user' ? (
                                        textContent
                                    ) : (
                                        <>
                                            {reasoningParts.map((r, ri) => (
                                                <Reasoning key={`reasoning-${ri}`} isStreaming={isStreaming && isLastAssistant && !textContent}>
                                                    <ReasoningTrigger />
                                                    {/* @ts-expect-error AI SDK type part might vary depending on exact version */}
                                                    <ReasoningContent>{(r as any).text || (r as any).reasoning || ''}</ReasoningContent>
                                                </Reasoning>
                                            ))}
                                            {(textContent || textParts.length > 0 || reasoningParts.length === 0) && (
                                                <MessageResponse parseIncompleteMarkdown={isStreaming && isLastAssistant}>
                                                    {textContent || ' '}
                                                </MessageResponse>
                                            )}
                                        </>
                                    )}
                                </MessageContent>
                            </MsgComponent>
                        );
                    })}
                </div>
            )}
            <div ref={bottomRef} />
        </>
    );
}
