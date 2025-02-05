"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ArrowDown } from "lucide-react";
import { useChat } from "ai/react";
import { Message } from "ai";
import { toast } from "sonner";

// Custom hooks
import { useChatUI } from "./hooks/useChatUI";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";

// Components
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";
import VoiceStyle from "./VoiceStyle";

/**
 * AIChatbox is the main component that combines all chat-related functionality
 * including message history, voice input, and UI controls
 */
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

  // State management
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);

  // Chat and voice recognition hooks
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit: handleChatSubmit,
    isLoading,
    setMessages,
    stop,
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
      toast.error("An error occurred while generating the response");
    },
    body: {
      userId: 1,
    },
  });

  const { isRecording, voiceActivity, toggleMicrophone, stopRecording } =
    useSpeechRecognition();

  // Load initial messages
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
        messagesContainer.style.scrollBehavior = 'auto';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        requestAnimationFrame(() => {
          messagesContainer.style.scrollBehavior = 'smooth';
        });
      }
    } else {
      setInput("");
    }
  }, [isOpen, setInput, chatBoxRef]);

  // Handle chat scroll and message loading
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

                const existingMessageIds = new Set(messages.map(m => m.id));
                const newMessages = sortedMessages.filter(msg => !existingMessageIds.has(msg.id));

                if (newMessages.length > 0) {
                  setMessages(prevMessages => [...newMessages, ...prevMessages]);
                  setCursor(data.nextCursor);
                  setHasMore(data.hasMore);
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

  // Handle new messages and scrolling
  useEffect(() => {
    if (messages.length > 0) {
      const messagesContainer = chatBoxRef.current?.querySelector('.relative.flex-1') as HTMLDivElement | null;
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        const lastMessage = messages[messages.length - 1];
        const isUserMessage = lastMessage?.role === 'user';

        if (isNearBottom || isUserMessage) {
          messagesContainer.style.scrollBehavior = 'smooth';
          requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    const messagesContainer = chatBoxRef.current?.querySelector('.relative.flex-1') as HTMLDivElement | null;
    if (messagesContainer) {
      messagesContainer.style.scrollBehavior = 'smooth';
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        setTimeout(() => {
          messagesContainer.style.scrollBehavior = 'auto';
        }, 300);
      });
    }

    handleChatSubmit(e);
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
      {!isFullScreen && !isMobile && (
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/10 active:bg-primary/20"
          onMouseDown={handleMouseDown}
          style={{ touchAction: "none" }}
        />
      )}

      <ChatHeader
        isFullScreen={isFullScreen}
        isMobile={isMobile}
        setIsFullScreen={setIsFullScreen}
        setIsOpen={setIsOpen}
        setWidth={setWidth}
      />

      <div
        className={cn(
          "relative flex-1 overflow-y-auto scroll-smooth",
          isDragging && "pointer-events-none",
          isFullScreen && !isMobile ? "p-6" : "px-3 py-4",
        )}
        onScroll={handleChatScroll}
      >
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          copiedMessageId={copiedMessageId}
          handleCopyMessage={handleCopyMessage}
          isFullScreen={isFullScreen}
          isDragging={isDragging}
        />
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        isLoading={isLoading}
        isRecording={isRecording}
        voiceActivity={voiceActivity}
        textareaRef={textareaRef}
        handleInputChange={handleInputChange}
        handleFormSubmit={handleFormSubmit}
        toggleMicrophone={toggleMicrophone}
        stopRecording={stopRecording}
        setInput={setInput}
        adjustTextareaHeight={adjustTextareaHeight}
        stop={stop}
      />

      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-32 right-6 z-10 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}

      <VoiceStyle />
    </Card>
  );
}
