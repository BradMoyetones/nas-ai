import type { UIMessage } from 'ai';
import { isTextUIPart, isReasoningUIPart } from 'ai';
import { Message as MsgComponent, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { TypewriterPhrases } from '@/components/typewriter-phrases';
import { Loader } from '@/components/loader';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
    isLoadingConversation?: boolean;
    error?: Error;
    onRetry?: () => void;
}

export function MessageList({
    messages,
    isStreaming,
    isLoadingConversation,
    error,
    onRetry,
}: MessageListProps) {
    if (isLoadingConversation) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center">
                <Loader />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center">
                <TypewriterPhrases />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 pb-4">
            {messages.map((m, i) => {
                const isLastMessage = i === messages.length - 1;
                const isLastAssistant = isLastMessage && m.role === 'assistant';

                const textParts = m.parts.filter(isTextUIPart);
                const reasoningParts = m.parts.filter(isReasoningUIPart);

                const textContent = textParts.map(p => p.text).join('');

                return (
                    <MsgComponent key={m.id || i} from={m.role}>
                        <MessageContent>
                            {m.role === 'user' ? (
                                textContent
                            ) : (
                                <>
                                    {reasoningParts.map((r, ri) => (
                                        <Reasoning
                                            key={`reasoning-${ri}`}
                                            isStreaming={isStreaming && isLastAssistant && !textContent}
                                        >
                                            <ReasoningTrigger />
                                            <ReasoningContent>{r.text}</ReasoningContent>
                                        </Reasoning>
                                    ))}
                                    {(textContent || reasoningParts.length === 0) && (
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

            {/* Indicador de pensando */}
            {isStreaming && messages.length > 0 && (
                messages[messages.length - 1].role === 'user' ||
                (messages[messages.length - 1].role === 'assistant' && 
                 !messages[messages.length - 1].parts?.some(p => isTextUIPart(p) || isReasoningUIPart(p)))
            ) && (
                <div className="flex gap-3 items-start">
                    <div className="text-sm text-muted-foreground">
                        <Shimmer duration={1}>Pensando...</Shimmer>
                    </div>
                </div>
            )}

            {/* Error inline — se muestra tras el último mensaje cuando hay error */}
            {error && !isStreaming && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">
                            Error en la generación
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {error.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}
                        </p>
                    </div>
                    {onRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            className="shrink-0 gap-1.5"
                        >
                            <RotateCcw className="size-3.5" />
                            Reintentar
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
