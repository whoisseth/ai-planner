import React from 'react';
import { Message } from 'ai';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { chatStyles } from "../styles";
import { AiAvatar } from './AiAvatar';

interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    isLoadingMore: boolean;
    copiedMessageId: string | null;
    handleCopyMessage: (message: Message) => void;
    isFullScreen: boolean;
    isDragging: boolean;
}

/**
 * ChatMessages component displays the list of chat messages with proper formatting
 * and copy functionality
 */
export function ChatMessages({
    messages,
    isLoading,
    isLoadingMore,
    copiedMessageId,
    handleCopyMessage,
    isFullScreen,
    isDragging,
}: ChatMessagesProps) {
    return (
        <div className={cn("space-y-4", isFullScreen && "mx-auto max-w-5xl")}>
            {isLoadingMore && (
                <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
            {messages.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">
                        Ask me anything about your tasks, schedule, or planning needs.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id || Math.random().toString()}
                            className={cn(
                                "mb-2 flex items-start gap-2",
                                message.role === "user" ? "justify-end" : "justify-start",
                            )}
                        >
                            {message.role === "assistant" && <AiAvatar />}
                            <div
                                className={cn(
                                    "group relative rounded-lg px-3",
                                    message.role === "user"
                                        ? "bg-primary max-w-[80%] text-primary-foreground py-2"
                                        : "max-w-full py-1.5",
                                )}
                            >
                                {message.role === "assistant" ? (
                                    <>
                                        <MarkdownPreview
                                            source={message.content}
                                            style={{
                                                backgroundColor: "transparent",
                                                color: "inherit",
                                                lineHeight: "1.3",
                                            }}
                                            className={cn(
                                                chatStyles.markdownPreview,
                                                "!text-sm [&_p]:!my-0.5 [&_p+p]:!mt-1.5 [&_ul]:!my-0.5 [&_ol]:!my-0.5 [&_li]:!my-0.5 [&_pre]:!my-1"
                                            )}
                                        />
                                        <div className="mt-1.5 flex justify-start">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                                onClick={() => handleCopyMessage(message)}
                                            >
                                                {message.id && copiedMessageId === message.id ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        <span>Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        <span>Copy</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="break-words text-sm">{message.content}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex items-start gap-3">
                            <AiAvatar />
                            <div className="rounded-lg bg-muted px-4 py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 