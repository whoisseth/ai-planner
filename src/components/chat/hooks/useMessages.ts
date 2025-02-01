"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { ChatMessage, ChatHistoryResponse } from "../types";
import { useRouter } from "next/navigation";

export const useMessages = () => {
  const router = useRouter();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const loadMessages = useCallback(async (cursor?: string | null) => {
    try {
      const url = new URL("/api/chat/history", window.location.origin);
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }
      const response = await fetch(url);
      const data: ChatHistoryResponse = await response.json();

      if (data.messages) {
        if (cursor) {
          const newMessages = [...data.messages];
          newMessages.sort(
            (a, b) =>
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime(),
          );
          setChatMessages((prev) => [...newMessages, ...prev]);
        } else {
          const sortedMessages = [...data.messages].sort(
            (a, b) =>
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime(),
          );
          setChatMessages(sortedMessages);
        }
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
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
      setIsLoadingMore(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      try {
        setIsLoading(true);
        
        // Add user message to chat immediately
        const userMessageObj = { role: "user", content: userMessage };
        setChatMessages(prev => [...prev, userMessageObj]);

        const response = await fetch("/api/chat/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: userMessage,
            messages: [...chatMessages, userMessageObj]
          }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder().decode(value);
          const lines = text.split("\n").filter(Boolean);

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(5);
              try {
                // Try to parse as JSON first
                const parsedData = JSON.parse(data);
                if (parsedData.type === 'task_created') {
                  // Task was created, trigger UI refresh and show success message
                  router.refresh();
                  setChatMessages(prev => [
                    ...prev,
                    { role: "assistant", content: parsedData.content }
                  ]);
                  // Exit early since we don't want to show any other messages
                  return;
                } else if (parsedData.isComplete && !parsedData.type) {
                  // Only show non-task messages if they're complete and not task-related
                  setChatMessages(prev => [
                    ...prev,
                    { role: "assistant", content: parsedData.content }
                  ]);
                }
              } catch (e) {
                // If not JSON, treat as plain text for non-task messages
                setChatMessages(prev => [
                  ...prev,
                  { role: "assistant", content: data }
                ]);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted");
        } else {
          console.error("Chat error:", error);
          toast({
            title: "Error",
            description: "Failed to send message",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        setAbortController(null);
      }
    },
    [chatMessages, router],
  );

  const stopResponse = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setChatMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          return [...prev.slice(0, -1), { ...lastMessage, isStreaming: false }];
        }
        return prev;
      });
    }
  }, [abortController]);

  return {
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
  };
};
