"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  MessageCircle,
  X,
  Maximize2,
  Minimize2,
  Square,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import MarkdownPreview from "@uiw/react-markdown-preview";

export function AIChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(500); // Default width
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: string; content: string; isStreaming?: boolean }>
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch("/api/chat/history");
        const data = await response.json();
        console.table(data)
        if (data.messages) {
          setChatMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  const handleStopResponse = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      // Add the last message as completed to prevent hanging state
      setChatMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          return [...prev.slice(0, -1), { ...lastMessage, isStreaming: false }];
        }
        return prev;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: inputValue }]);
    const userMessage = inputValue;
    setInputValue("");

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: userMessage }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to send message");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let currentMessage = {
        role: "assistant",
        content: "",
        // isStreaming: true
      };

      setChatMessages((prev) => [...prev, currentMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.isComplete) {
                // Replace the streaming message with the complete one
                setChatMessages((prev) => [
                  ...prev.slice(0, -1),
                  { role: "assistant", content: parsed.content },
                ]);
              } else if (parsed.isStreaming) {
                // Update the current streaming message
                setChatMessages((prev) => [
                  ...prev.slice(0, -1),
                  { ...currentMessage, content: parsed.content },
                ]);
                currentMessage.content = parsed.content;
              }
            } catch (e) {
              console.error("Failed to process chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle mouse down event to start dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(width);
  };

  // Handle mouse move event while dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = startX - e.clientX;
      const newWidth = Math.max(400, Math.min(1200, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging, startX, startWidth]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
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
        "fixed z-50 flex flex-col overflow-hidden shadow-xl",
        isFullScreen
          ? "inset-0 w-full rounded-none md:inset-4 md:rounded-lg"
          : "bottom-4 right-4 h-[600px] max-h-[calc(100vh-2rem)] rounded-lg",
        isDragging && "select-none",
      )}
      style={
        !isFullScreen
          ? {
            width: `${width}px`,
            transition: isDragging ? "none" : "width 0.3s ease-in-out",
          }
          : undefined
      }
    >
      {/* Add drag handle with improved styling */}
      {!isFullScreen && (
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/10 active:bg-primary/20"
          onMouseDown={handleMouseDown}
          style={{ touchAction: "none" }}
        />
      )}

      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">AI Assistant</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsFullScreen(!isFullScreen);
              if (!isFullScreen) {
                setWidth(500); // Reset width when going fullscreen
              }
            }}
            className="hover:bg-primary/10"
          >
            {isFullScreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
              setIsFullScreen(false);
              setWidth(500); // Reset width when closing
            }}
            className="hover:bg-primary/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea
        className={cn(
          "flex-1 overflow-y-auto p-4",
          isDragging && "pointer-events-none", // Prevent scroll during resize
        )}
      >
        <div
          className={cn("space-y-4", isFullScreen && "mx-auto max-w-2xl px-4")}
        >
          {isLoadingHistory ? (
            // Skeleton loading UI
            <div className="space-y-4">
              <div className="h-10 w-[60%] animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-10 w-[80%] animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-[70%] animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-[70%] animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-10 w-[75%] animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-[70%] animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-[70%] animate-pulse rounded-lg bg-muted" />
              <div className="ml-auto h-10 w-[70%] animate-pulse rounded-lg bg-muted" />
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <h4 className="mb-2 text-lg font-medium">
                Welcome to AI Assistant!
              </h4>
              <p className="text-sm">
                Ask me anything about your tasks, schedule, or planning needs.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {chatMessages.map((message, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg px-4 py-2.5 text-sm mb-4",
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
                        className={cn(
                          "[&_.wmde-markdown]:bg-transparent",
                          "[&_blockquote]:pl-4 [&_blockquote]:italic",
                          "[&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5",
                          "[&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6",
                          "[&_pre]:rounded-lg [&_pre]:p-4",
                          // Enhanced table styles
                          "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_table]:border [&_table]:border-border",
                          "[&_table]:bg-background/50 [&_table]:shadow-sm",
                          // Table header styles
                          "[&_thead]:bg-muted/50",
                          "[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold",
                          // Table cell styles
                          "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-middle",
                          // Text wrapping and overflow
                          "[&_td]:max-w-[200px] [&_td]:break-words",
                          "[&_th]:max-w-[200px] [&_th]:break-words",
                          // Dark mode
                          "dark:[&_table]:bg-background/5",
                          "dark:[&_thead]:bg-muted/20",
                          // Mobile optimizations
                          "text-[13px] md:text-sm",
                          // Ensure content is readable
                          "prose prose-sm max-w-none dark:prose-invert",
                          "[&_p]:mb-2 [&_p]:text-foreground",
                          // Scrollable table container
                          "[&_table]:block [&_table]:overflow-x-auto md:[&_table]:inline-table",
                          "[&_table]:max-w-full",
                          // Priority column
                          "[&_td:first-child]:whitespace-nowrap [&_td:first-child]:font-medium",
                          "[&_th:first-child]:whitespace-nowrap",
                        )}
                      />
                    </div>
                  ) : (
                    <div className="break-words">{message.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t bg-background/80 p-4 backdrop-blur-sm"
      >
        <div
          className={cn("flex gap-2", isFullScreen && "mx-auto max-w-2xl px-4")}
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="h-12 flex-1 text-base"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="gap-2 px-6"
              onClick={handleStopResponse}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="px-6"
              disabled={!inputValue.trim()}
            >
              Send
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
