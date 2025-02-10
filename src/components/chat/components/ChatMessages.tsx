import React from "react";
import { Message } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Sparkles } from "lucide-react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { chatStyles } from "../styles";
import { AiAvatar } from "./AiAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  copiedMessageId: string | null;
  handleCopyMessage: (message: Message) => void;
  isFullScreen: boolean;
  isDragging: boolean;
  isClearing?: boolean;
}

const ThinkingDots = () => (
  <div className="flex gap-1">
    {[1, 2, 3].map((dot) => (
      <motion.div
        key={dot}
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
        initial={{ opacity: 0.7, y: 0 }}
        animate={{
          opacity: [0.7, 1, 0.7],
          y: [0, -3, 0],
          transition: {
            duration: 0.8,
            repeat: Infinity,
            delay: dot * 0.15,
          },
        }}
      />
    ))}
  </div>
);

const ThinkingMessage = () => (
  <motion.div
    className="mb-2 flex items-start gap-2"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.3,
      ease: "easeOut",
    }}
  >
    <motion.div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.1,
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          },
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </motion.div>
    </motion.div>
    <div className="group relative rounded-lg bg-background px-3 py-2">
      <motion.div
        className="flex items-center gap-2 text-muted-foreground"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-sm font-medium">Thinking</span>
        <ThinkingDots />
      </motion.div>
    </div>
  </motion.div>
);

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
  isClearing = false,
}: ChatMessagesProps) {
  const [animationParent] = useAutoAnimate();

  const messageVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
    },
    exit: (custom: number) => ({
      opacity: 0,
      scale: 0.8,
      y: -20,
      transition: {
        duration: 0.2,
        delay: custom * 0.05,
      }
    })
  };

  // Helper function to determine if a message should animate
  const shouldAnimateMessage = (message: Message, isLastMessage: boolean) => {
    if (isClearing) return true; // Always animate when clearing
    if (message.role === "assistant" && isLoading && isLastMessage) return false; // Don't animate loading AI response
    return message.role === "user"; // Only animate user messages
  };

  return (
    <div className={cn("space-y-4", isFullScreen && "mx-auto max-w-5xl")}>
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {messages.length === 0 ? (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={messageVariants}
          transition={{ duration: 0.3 }}
          className="py-8 text-center text-muted-foreground"
        >
          <p className="text-sm">
            Ask me anything about your tasks, schedule, or planning needs.
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col space-y-4">
          <AnimatePresence mode="sync">
            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              const shouldAnimate = shouldAnimateMessage(message, isLastMessage);

              return (
                <motion.div
                  key={message.id || Math.random().toString()}
                  initial={shouldAnimate ? "hidden" : { opacity: 1 }}
                  animate={isClearing ? "exit" : (shouldAnimate ? "visible" : { opacity: 1 })}
                  exit={shouldAnimate ? "exit" : undefined}
                  variants={messageVariants}
                  custom={messages.length - index - 1}
                  transition={shouldAnimate ? {
                    duration: 0.3,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  } : undefined}
                  layout={!isLoading}
                  className={cn(
                    "mb-2 flex items-start gap-2",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" && <AiAvatar />}
                  <div
                    ref={animationParent}
                    className={cn(
                      "group relative rounded-lg px-3",
                      message.role === "user"
                        ? "max-w-[80%] bg-primary py-2 text-primary-foreground"
                        : "max-w-full py-1.5",
                      message.isStreaming && "animate-pulse",
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
                            "!text-sm [&_li]:!my-0.5 [&_ol]:!my-0.5 [&_p+p]:!mt-1.5 [&_p]:!my-0.5 [&_pre]:!my-1 [&_ul]:!my-0.5",
                          )}
                        />
                        {message.toolInvocations &&
                        message.toolInvocations.some(
                          (toolInvocation) => toolInvocation.args,
                        ) &&
                        message.content.length < 1 ? (
                          <>
                            {message.toolInvocations.map((toolInvocation) => (
                              <div
                                key={toolInvocation.toolName}
                                className="space-y-2 text-sm"
                              >
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <span className="font-medium">
                                    Calling '{toolInvocation.toolName}'
                                  </span>
                                  <ThinkingDots />
                                </div>
                                <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
                                  <code className="text-foreground/90">
                                    {JSON.stringify(toolInvocation.args, null, 2)}
                                  </code>
                                </pre>
                              </div>
                            ))}
                          </>
                        ) : null}
                        {message.content && (
                          <div className="mt-1.5 flex justify-start">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex h-6 items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
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
                        )}
                      </>
                    ) : (
                      <div className="break-words text-sm">{message.content}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <ThinkingMessage />
          )}
        </div>
      )}
    </div>
  );
}
