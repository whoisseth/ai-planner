"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  MessageCircle,
  X,
  Maximize2,
  Minimize2,
  ArrowDown,
  Mic,
  MicOff,
  Send,
  Copy,
  Check,
} from "lucide-react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { useChatUI } from "./hooks/useChatUI";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { chatStyles } from "./styles";
import VoiceStyle from "./VoiceStyle";
import { useChat } from "ai/react";
import { Message } from "ai";
import { toast } from "sonner";
import { VoiceWave } from './VoiceWave';

export function AIChatbox() {
  const router = useRouter();
  const {
    isOpen,
    setIsOpen,
    isDragging,
    isFullScreen,
    setIsFullScreen,
    width,
    setWidth,
    isMobile,
    showScrollButton,
    chatBoxRef,
    messagesEndRef,
    textareaRef,
    scrollToBottom,
    handleScroll,
    handleMouseDown,
    adjustTextareaHeight,
  } = useChatUI();

  // Add state for cursor-based pagination
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit: handleChatSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat/ai",
    initialMessages: initialMessages,
    onResponse: (response) => {
      if (response.ok) {
        router.refresh();
      } else {
        console.error('Error in chat response:', response.statusText);
      }
    },
    onFinish: () => {
      router.refresh();
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
    body: {
      userId: 1,
    },
  });

  const { isRecording, voiceActivity, toggleMicrophone, stopRecording } =
    useSpeechRecognition();

  // Update the loadInitialMessages function
  useEffect(() => {
    async function loadInitialMessages() {
      if (!hasLoadedInitialMessages) {
        try {
          const response = await fetch('/api/chat/history');
          if (response.ok) {
            const data = await response.json();
            if (data.messages) {
              const sortedMessages = [...data.messages].sort(
                (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
              );
              setInitialMessages(sortedMessages);
              setMessages(sortedMessages);
              setCursor(data.nextCursor);
              setHasMore(data.hasMore);
              setHasLoadedInitialMessages(true);
            }
          }
        } catch (error) {
          console.error('Failed to load initial messages:', error);
        }
      }
    }

    loadInitialMessages();
  }, [setMessages, hasLoadedInitialMessages]);

  // Handle chat box open state
  useEffect(() => {
    if (isOpen) {
      const messagesContainer = chatBoxRef.current?.querySelector('.relative.flex-1') as HTMLDivElement;
      if (messagesContainer) {
        // Set initial scroll position to bottom without animation
        messagesContainer.style.scrollBehavior = 'auto';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        // Restore smooth scrolling after initial positioning
        requestAnimationFrame(() => {
          messagesContainer.style.scrollBehavior = 'smooth';
        });
      }
    } else {
      setInput("");
    }
  }, [isOpen, setInput, chatBoxRef]);

  // Update the handleChatScroll function
  const handleChatScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;

    handleScroll(e, hasMore, isLoadingMore, false, () => {
      if (scrollTop < 100 && !isLoadingMore && hasMore) {
        setIsLoadingMore(true);
        fetch(`/api/chat/history${cursor ? `?cursor=${cursor}` : ''}`)
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              if (data.messages && data.messages.length > 0) {
                const sortedMessages = [...data.messages].sort(
                  (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
                );

                // Deduplicate messages based on content and timestamp
                const existingMessageIds = new Set(messages.map(m => m.id));
                const newMessages = sortedMessages.filter(msg => !existingMessageIds.has(msg.id));

                if (newMessages.length > 0) {
                  setMessages(prevMessages => [...newMessages, ...prevMessages]);
                  setCursor(data.nextCursor);
                  setHasMore(data.hasMore);
                  // Maintain scroll position after loading more messages
                  requestAnimationFrame(() => {
                    if (target) {
                      target.scrollTop = 100;
                    }
                  });
                } else {
                  setHasMore(false);
                }
              } else {
                setHasMore(false);
              }
            }
          })
          .catch(error => {
            console.error('Failed to load more messages:', error);
          })
          .finally(() => {
            setIsLoadingMore(false);
          });
      }
    });
  }, [handleScroll, cursor, hasMore, isLoadingMore, messages, setMessages]);

  // Handle new messages
  useEffect(() => {
    if (messages.length > 0) {
      const messagesContainer = chatBoxRef.current?.querySelector('.relative.flex-1') as HTMLDivElement | null;
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        // Check if user is already near bottom (within 100px)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        // Only auto-scroll if user was already near bottom or if it's a new user message
        const lastMessage = messages[messages.length - 1];
        const isUserMessage = lastMessage?.role === 'user';

        if (isNearBottom || isUserMessage) {
          // Use smooth scrolling for a better experience
          messagesContainer.style.scrollBehavior = 'smooth';
          requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            // Reset scroll behavior after animation
            setTimeout(() => {
              messagesContainer.style.scrollBehavior = 'auto';
            }, 300);
          });
        }
      }
      if (!isLoading) {
        router.refresh();
      }
    }
  }, [messages, isLoading, router, chatBoxRef]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (isRecording) {
      stopRecording();
    }

    // Scroll to bottom smoothly when submitting
    const messagesContainer = chatBoxRef.current?.querySelector('.relative.flex-1') as HTMLDivElement | null;
    if (messagesContainer) {
      messagesContainer.style.scrollBehavior = 'smooth';
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        // Reset scroll behavior after animation
        setTimeout(() => {
          messagesContainer.style.scrollBehavior = 'auto';
        }, 300);
      });
    }

    handleChatSubmit(e);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    requestAnimationFrame(adjustTextareaHeight);
  };

  const handleCopyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copied to clipboard");
      const messageId = message.id || `msg-${Date.now()}`;
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
      toast.error("Failed to copy message");
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true);
          if (isMobile) {
            setIsFullScreen(true);
          }
        }}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full p-0 shadow-lg transition-all hover:shadow-xl lg:bottom-4"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      ref={chatBoxRef}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden shadow-xl transition-all duration-200",
        isFullScreen || isMobile
          ? "inset-0"
          : "bottom-4 right-4 h-[600px] max-h-[calc(100vh-2rem)] rounded-lg",
        isDragging && "select-none",
      )}
      style={
        !isFullScreen && !isMobile
          ? {
            width: `${width}px`,
            transition: isDragging ? "none" : "width 0.3s ease-in-out",
          }
          : undefined
      }
    >
      {/* Add drag handle */}
      {!isFullScreen && !isMobile && (
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/10 active:bg-primary/20"
          onMouseDown={handleMouseDown}
          style={{ touchAction: "none" }}
        />
      )}

      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b p-4",
          isFullScreen && !isMobile && "px-8 py-4",
        )}
      >
        <h3
          className={cn(
            "text-lg font-semibold",
            isFullScreen && !isMobile && "text-xl",
          )}
        >
          AI Assistant
        </h3>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <Button
              variant="ghost"
              size={isFullScreen ? "default" : "icon"}
              onClick={() => {
                setIsFullScreen(!isFullScreen);
                if (!isFullScreen) {
                  setWidth(500);
                }
              }}
              className="hover:bg-primary/10"
            >
              {isFullScreen ? (
                <div className="flex items-center gap-2">
                  <Minimize2 className="h-4 w-4" />
                  <span>Exit Fullscreen</span>
                </div>
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
              setIsFullScreen(false);
              setWidth(500);
            }}
            className="hover:bg-primary/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className={cn(
          "relative flex-1 overflow-y-auto scroll-smooth",
          isDragging && "pointer-events-none",
          isFullScreen && !isMobile ? "p-6" : "px-3 py-4",
        )}
        onScroll={handleChatScroll}
      >
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
                  {message.role === "assistant" && (
                    <AiAvatar />
                  )}
                  <div
                    className={cn(
                      "group relative rounded-lg px-3",
                      message.role === "user"
                        ? "bg-primary max-w-[80%] text-primary-foreground py-2"
                        : "max-w-full py-1.5",
                    )}>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t px-4 py-3">
        <div className="relative flex items-center rounded-xl border">
          {isRecording && <VoiceWave isRecording={isRecording} voiceActivity={voiceActivity} />}
          <form onSubmit={handleFormSubmit} className="flex-1" id="chat-form">
            <Textarea
              rows={2}
              autoFocus
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onFocus={() => {
                if (isRecording) {
                  stopRecording();
                }
              }}
              placeholder="Type a message..."
              className="min-h-[96px] w-full rounded-lg resize-none border-0 bg-transparent py-3 text-sm focus:ring-0 overflow-y-auto"
              style={{
                maxHeight: '200px',
                paddingRight: '80px', // Add padding for the buttons
                paddingBottom: '12px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,0,0,0.2) transparent'
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit(e as any);
                }
              }}
            />
          </form>
          <div className="absolute right-0 bottom-0 flex items-center gap-1 px-2 ">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => toggleMicrophone((text) => setInput(text))}
            >
              {isRecording ? (
                <MicOff className="size-5 text-red-500" />
              ) : (
                <Mic className="size-5 text-zinc-400" />
              )}
            </Button>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  handleFormSubmit(e as any);
                }
              }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-32 right-6 z-10 rounded-full  shadow-lg "
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}

      {/* Voice Visualization Styles */}
      <VoiceStyle />
    </Card>
  );
}


function AiAvatar() {
  return (
    <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background"><div className="translate-y-px"><svg height="14" stroke-linejoin="round" viewBox="0 0 16 16" width="14" style={{ color: "currentcolor" }}><path d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z" fill="currentColor"></path><path d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z" fill="currentColor"></path><path d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z" fill="currentColor"></path></svg></div></div>
  )
}
