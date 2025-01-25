"use client";

import { useEffect, useRef, useState } from "react";
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
import { toast } from "@/components/ui/use-toast";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { speechRecognition } from "@/lib/speech-recognition";

// Add Web Speech API TypeScript definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function AIChatbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(500);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: string; content: string; createdAt?: string; isStreaming?: boolean }>
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isLoadingMore ? 'auto' : 'smooth'
    });
  };

  const loadMessages = async (cursor?: string | null) => {
    console.log('Loading messages...', { cursor, isLoadingMore, isLoadingHistory });

    try {
      const url = new URL("/api/chat/history", window.location.origin);
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }
      const response = await fetch(url);
      const data = await response.json();
      console.log('Received messages:', data);

      if (data.messages) {
        if (cursor) {
          const newMessages = [...data.messages];
          newMessages.sort((a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          );
          setChatMessages(prev => [...newMessages, ...prev]);
        } else {
          const sortedMessages = [...data.messages].sort((a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
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
  };

  // Load initial messages when component mounts
  useEffect(() => {
    if (isOpen) {
      console.log('Component opened, loading initial messages');
      setIsLoadingHistory(true);
      loadMessages();
    } else {
      // Reset states when closing
      setChatMessages([]);
      setHasMore(false);
      setNextCursor(null);
    }
  }, [isOpen]);

  // Handle scroll to load more messages and show/hide scroll button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollContainer = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

    // Show scroll button when scrolled up just a little (20px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setShowScrollButton(!isAtBottom);

    // Only load more if we're very close to the top (within 50px) and have more messages
    if (scrollTop < 50 && hasMore && !isLoadingMore && !isLoadingHistory) {
      // Calculate if we're at the absolute top
      const isAtTop = scrollTop === 0;

      if (isAtTop) {
        console.log('At top, loading more messages...', { nextCursor });
        setIsLoadingMore(true);
        loadMessages(nextCursor);
      }
    }
  };

  // Only scroll to bottom for new messages, not for loading history or older messages
  useEffect(() => {
    if (chatMessages.length > 0 && !isLoadingHistory && !isLoadingMore) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if ((lastMessage.role === "assistant" || lastMessage.role === "user") &&
        !lastMessage.createdAt) {
        scrollToBottom();
      }
    }
  }, [chatMessages, isLoadingHistory, isLoadingMore]);

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

    // Stop recording if active
    if (isRecording) {
      speechRecognition.stopRecording();
      setIsRecording(false);
      setVoiceActivity([]);
    }

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

  // Handle mobile responsiveness
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      if (isMobileView && isOpen) {
        setIsFullScreen(true);
      }
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    const init = async () => {
      const success = await speechRecognition.initialize();
      if (!success) {
        console.log('Speech recognition initialization failed');
        // Don't show error toast on initial load
      }
    };
    init();
  }, []);

  // Auto-resize textarea whenever input value changes
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;

      // Reset height temporarily to get the correct scrollHeight
      textarea.style.height = '48px';  // Start from min height

      // Calculate the scroll height
      const scrollHeight = textarea.scrollHeight;

      // Set the height based on content with min/max constraints
      const minHeight = 48;
      const maxHeight = 300;

      // Calculate new height
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;

      // Enable/disable scrolling based on content height
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };

  // Update the textarea onChange handler
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Adjust height on next frame
    requestAnimationFrame(adjustTextareaHeight);
  };

  // Also adjust height when receiving speech input
  useEffect(() => {
    if (inputValue) {
      requestAnimationFrame(adjustTextareaHeight);
    } else {
      // Reset to min height when empty
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    }
  }, [inputValue]);

  // Update the speech recognition callback
  const toggleMicrophone = async () => {
    if (!speechRecognition.isInitialized()) {
      try {
        // Try to initialize again when user explicitly clicks the mic button
        const success = await speechRecognition.initialize();
        if (!success) {
          toast({
            title: "Speech Recognition Error",
            description: "Please ensure your browser supports speech recognition and microphone access is allowed.",
            variant: "destructive",
          });
          return;
        }
      } catch (err) {
        toast({
          title: "Speech Recognition Error",
          description: "Failed to initialize speech recognition. Please check browser compatibility.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isRecording) {
      speechRecognition.stopRecording();
      setIsRecording(false);
      setVoiceActivity([]);
    } else {
      // Clear existing input when starting new recording
      setInputValue('');

      try {
        const success = await speechRecognition.startRecording(
          // Visualization callback
          (bands) => {
            setVoiceActivity(bands);
          },
          // Transcription callback
          (text) => {
            if (text.trim()) { // Only update if we have non-empty text
              setInputValue(text);
            }
          }
        );

        if (success) {
          setIsRecording(true);
        } else {
          toast({
            title: "Recording Error",
            description: "Failed to start recording. Please check your microphone permissions.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Recording error:', err);
        toast({
          title: "Recording Error",
          description: "An error occurred while recording. Please try again.",
          variant: "destructive",
        });
      }
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
          ? "inset-0 h-dvh w-screen rounded-none"
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
      {/* Add drag handle with improved styling */}
      {!isFullScreen && !isMobile && (
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/10 active:bg-primary/20"
          onMouseDown={handleMouseDown}
          style={{ touchAction: "none" }}
        />
      )}

      <div className={cn(
        "flex items-center justify-between border-b p-4",
        isFullScreen && !isMobile && "px-8 py-4"
      )}>
        <h3 className={cn(
          "text-lg font-semibold",
          isFullScreen && !isMobile && "text-xl"
        )}>AI Assistant</h3>
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

      <div
        className={cn(
          "flex-1 overflow-y-auto relative",
          isDragging && "pointer-events-none",
          isFullScreen && !isMobile ? "p-6" : "p-4"
        )}
        onScroll={handleScroll}
      >
        <div className={cn(
          "space-y-4",
          isFullScreen && "mx-auto max-w-5xl"
        )}>
          {/* Loading More Indicator - Move to top */}
          {isLoadingMore && (
            <div className="sticky top-0 flex justify-center py-2 bg-background/80 backdrop-blur-sm z-10">
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
              <h4 className="mb-2 text-lg font-medium">Welcome to AI Assistant!</h4>
              <p className="text-sm">Ask me anything about your tasks, schedule, or planning needs.</p>
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
                        className={cn(
                          "[&_.wmde-markdown]:bg-transparent",
                          "[&_blockquote]:pl-4 [&_blockquote]:italic",
                          "[&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5",
                          "[&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6",
                          "[&_pre]:rounded-lg [&_pre]:p-4",
                          // Enhanced table styles
                          "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_table]:border [&_table]:border-border",
                          // Light mode adjustments for better visibility
                          "[&_table]:bg-white [&_table]:shadow-sm",
                          "[&_thead]:bg-gray-100",
                          "[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-white",
                          "[&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-middle [&_td]:text-white",
                          // Dark mode adjustments for better visibility
                          "dark:[&_table]:bg-background/20",
                          "dark:[&_thead]:bg-muted/30",
                          "dark:[&_th]:text-white",
                          "dark:[&_td]:text-gray-300",
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
                          '[&_tr]:text-primary-foreground'
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
              className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:translate-y-[-2px]"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn(
          "border-t bg-background/80 backdrop-blur-sm",
          isFullScreen && !isMobile ? "p-6" : "p-4"
        )}
      >
        <div
          className={cn(
            "flex gap-3 relative",
            isFullScreen && "mx-auto max-w-6xl"
          )}
        >
          <div className="flex-1 flex flex-col relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onFocus={() => {
                if (isRecording) {
                  speechRecognition.stopRecording();
                  setIsRecording(false);
                  setVoiceActivity([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim()) {
                    // Stop recording if active before submitting
                    if (isRecording) {
                      speechRecognition.stopRecording();
                      setIsRecording(false);
                      setVoiceActivity([]);
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
                isRecording && "recording-active"
              )}
              style={{
                transition: "height 0.2s ease-out, background-color 0.2s ease-out",
                height: "48px", // Initial height
              }}
              disabled={isLoading}
            />

            {/* Voice visualization - Enhanced version */}
            {isRecording && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Voice activity visualization - Moved next to mic button */}
                <div className="absolute right-[82px] top-1/2 -translate-y-1/2 flex items-center gap-[2px] h-6">
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

            {/* Overlapped buttons with enhanced recording indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "destructive" : "ghost"}
                  className={cn(
                    "h-8 w-8 rounded-full transition-all duration-200",
                    isRecording && "bg-red-500 text-white hover:bg-red-600"
                  )}
                  onClick={toggleMicrophone}
                  disabled={isLoading}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                {isRecording && (
                  <div className="absolute inset-[-4px] rounded-full border-2 border-red-500/50">
                    <div className="absolute inset-[-2px] animate-pulse-ring rounded-full border-2 border-red-500/30" />
                  </div>
                )}
              </div>

              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8 rounded-full"
                  onClick={handleStopResponse}
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
                    inputValue.trim() && "text-primary hover:text-primary"
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

      {/* Enhanced styles for voice visualization */}
      <style jsx global>{`
        .recording-active {
          background-color: rgba(220, 38, 38, 0.04);
          box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.15);
          transition: all 0.2s ease-in-out;
        }

        .recording-active:focus {
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.25);
        }

        .voice-bar {
          width: 3px;
          min-height: 2px;
          border-radius: 3px;
          transition: all 0.1s ease-in-out;
          transform-origin: bottom;
          background: linear-gradient(to top, rgb(239, 68, 68), rgb(248, 113, 113));
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.3);
          animation: voice-bar-scale 0.2s ease-out;
        }

        @keyframes voice-bar-scale {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 0.4; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </Card>
  );
}
