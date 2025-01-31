"use client";

import { useEffect, useState } from "react";
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
  Square,
  ArrowDown,
  Mic,
  MicOff,
  Send,
} from "lucide-react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { useChatUI } from "./hooks/useChatUI";
import { useMessages } from "./hooks/useMessages";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { chatStyles } from "./styles";
import VoiceStyle from "./VoiceStyle";

export function AIChatbox() {
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

  const {
    chatMessages,
    isLoading,
    isLoadingHistory,
    isLoadingMore,
    hasMore,
    nextCursor,
    loadMessages,
    sendMessage,
    stopResponse,
    setIsLoadingHistory,
    setIsLoadingMore,
  } = useMessages();

  const { isRecording, voiceActivity, toggleMicrophone, stopRecording } =
    useSpeechRecognition();

  const [inputValue, setInputValue] = useState("");

  // Load initial messages when component mounts
  useEffect(() => {
    if (isOpen) {
      console.log("Component opened, loading initial messages");
      setIsLoadingHistory(true);
      loadMessages();
    } else {
      // Reset states when closing
      setInputValue("");
    }
  }, [isOpen, loadMessages, setIsLoadingHistory]);

  // Handle scroll to load more messages
  useEffect(() => {
    if (chatMessages.length > 0 && !isLoadingHistory && !isLoadingMore) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (
        (lastMessage.role === "assistant" || lastMessage.role === "user") &&
        !lastMessage.createdAt
      ) {
        scrollToBottom();
      }
    }
  }, [chatMessages, isLoadingHistory, isLoadingMore, scrollToBottom]);

  // Preserve scroll position when loading more messages
  useEffect(() => {
    if (isLoadingMore && chatBoxRef.current) {
      const scrollElement = chatBoxRef.current.querySelector('.overflow-y-auto');
      if (scrollElement) {
        const prevHeight = scrollElement.scrollHeight;
        
        const handleNewMessages = () => {
          const newHeight = scrollElement.scrollHeight;
          scrollElement.scrollTop = newHeight - prevHeight;
        };

        // Use MutationObserver to detect when new messages are added
        const observer = new MutationObserver(handleNewMessages);
        observer.observe(scrollElement, { childList: true, subtree: true });

        return () => observer.disconnect();
      }
    }
  }, [isLoadingMore]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (isRecording) {
      stopRecording();
    }

    const message = inputValue;
    setInputValue("");
    await sendMessage(message);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    requestAnimationFrame(adjustTextareaHeight);
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
          "relative flex-1 overflow-y-auto",
          isDragging && "pointer-events-none",
          isFullScreen && !isMobile ? "p-6" : "p-4",
        )}
        onScroll={(e) => handleScroll(
          e,
          hasMore,
          isLoadingMore,
          isLoadingHistory,
          () => {
            setIsLoadingMore(true);
            loadMessages(nextCursor);
          }
        )}
      >
        <div className={cn("space-y-4", isFullScreen && "mx-auto max-w-5xl")}>
          {/* Loading More Indicator */}
          {isLoadingMore && (
            <div className="sticky top-0 z-10 flex justify-center bg-background/80 py-2 backdrop-blur-sm">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Messages */}
          {isLoadingHistory ? (
            <div className="space-y-4">
              <div className="h-10 w-[60%] animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-10 w-[80%] animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-[70%] animate-pulse rounded-lg bg-muted" />
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">
                Ask me anything about your tasks, schedule, or planning needs.
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {chatMessages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "ml-auto w-fit max-w-[80%] bg-primary text-primary-foreground"
                      : "mr-auto w-full bg-secondary/50 backdrop-blur-sm",
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="w-full overflow-hidden">
                      <MarkdownPreview
                        source={message.content}
                        style={{
                          backgroundColor: "transparent",
                          color: "inherit",
                          fontSize: "0.875rem",
                        }}
                        className={chatStyles.markdownPreview}
                      />
                    </div>
                  ) : (
                    <div className="break-words">{message.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Current Message Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <div className="fixed bottom-[120px] right-12 z-50">
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full shadow-lg transition-all duration-200 hover:translate-y-[-2px] hover:shadow-xl"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          "border-t bg-background/80 backdrop-blur-sm",
          isFullScreen && !isMobile ? "p-6" : "p-4",
        )}
      >
        <div
          className={cn(
            "relative flex gap-3",
            isFullScreen && "mx-auto max-w-6xl",
          )}
        >
          <div className="relative flex flex-1 flex-col">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onFocus={() => {
                if (isRecording) {
                  stopRecording();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim()) {
                    if (isRecording) {
                      stopRecording();
                    }
                    handleSubmit(e as any);
                  }
                }
              }}
              placeholder="Type your message or use the microphone..."
              className={cn(
                "flex-1 resize-none text-base",
                "min-h-[48px] py-3 pr-[120px]",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                isFullScreen && !isMobile ? "text-base" : "",
                isRecording && "recording-active",
              )}
              style={{
                transition:
                  "height 0.2s ease-out, background-color 0.2s ease-out",
                height: "48px",
              }}
              disabled={isLoading}
            />

            {/* Voice visualization */}
            {isRecording && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute right-[82px] top-1/2 flex h-6 -translate-y-1/2 items-center gap-[2px]">
                  {voiceActivity.map((level, i) => (
                    <div
                      key={i}
                      className="voice-bar"
                      style={{
                        height: `${Math.min(100, level * 0.8)}%`,
                        opacity: Math.min(1, level / 30),
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "destructive" : "ghost"}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
                    isRecording && "bg-red-500 text-white hover:bg-red-600",
                  )}
                  onClick={() =>
                    toggleMicrophone((text) => setInputValue(text))
                  }
                  disabled={isLoading}
                  aria-label={
                    isRecording ? "Stop recording" : "Start recording"
                  }
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                {isRecording && (
                  <div
                    className="absolute inset-[-4px] cursor-pointer rounded-full border-2 border-red-500/50"
                    onClick={() =>
                      toggleMicrophone((text) => setInputValue(text))
                    }
                  >
                    <div className="animate-pulse-ring absolute inset-[-2px] rounded-full border-2 border-red-500/30" />
                  </div>
                )}
              </div>

              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8 rounded-full"
                  onClick={stopResponse}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    inputValue.trim() && "text-primary hover:text-primary",
                  )}
                  disabled={!inputValue.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Voice Visualization Styles */}
      <VoiceStyle />
    </Card>
  );
}
