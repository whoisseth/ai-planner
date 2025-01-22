"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, X, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export function AIChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch("/api/chat/history");
        const data = await response.json();
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    // Add user message to chat
    setChatMessages((prev) => [...prev, { role: "user", content: inputValue }]);
    setInputValue("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatMessages.concat({ role: "user", content: inputValue }),
        }),
      });

      const data = await response.json();

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
        },
      ]);
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

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [chatMessages]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bottom:20 fixed right-4 z-50 h-14 w-14 rounded-full p-0 shadow-lg transition-all hover:shadow-xl lg:bottom-4"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden shadow-xl transition-all duration-300 ease-in-out",
        isFullScreen
          ? "inset-0 rounded-none md:inset-4 md:rounded-lg"
          : "bottom-4 right-4 h-[600px] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] rounded-lg md:w-[400px]",
      )}
    >
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">AI Assistant</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullScreen(!isFullScreen)}
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
            }}
            className="hover:bg-primary/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
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
            chatMessages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-2 rounded-lg px-4 py-2.5 text-sm",
                  message.role === "user"
                    ? "ml-auto w-fit max-w-[80%] bg-primary text-primary-foreground"
                    : "mr-auto w-fit max-w-[80%] bg-muted",
                  message.role === "assistant" && "whitespace-pre-wrap",
                )}
              >
                {message.content}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t bg-background/80 p-4 backdrop-blur-sm"
      >
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="h-12 flex-1 text-base"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="lg"
            className="px-6"
            disabled={isLoading || !inputValue.trim()}
          >
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}
