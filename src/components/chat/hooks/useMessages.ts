"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { ChatMessage, ChatHistoryResponse } from "../types";

export const useMessages = () => {
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
      setIsLoading(true);
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: userMessage },
      ]);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        // const response = await fetch("/api/chat", {
        const response = await fetch("/api/chat/ai", {
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
                  setChatMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: parsed.content },
                  ]);
                } else if (parsed.isStreaming) {
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
    [chatMessages],
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
