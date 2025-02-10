import React from 'react';
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  isFullScreen: boolean;
  isMobile: boolean;
  setIsFullScreen: (value: boolean) => void;
  setIsOpen: (value: boolean) => void;
  setWidth: (value: number) => void;
  onClearChat: () => void;
}

/**
 * ChatHeader component displays the header of the chat interface with
 * fullscreen toggle and close buttons
 */
export function ChatHeader({
  isFullScreen,
  isMobile,
  setIsFullScreen,
  setIsOpen,
  setWidth,
  onClearChat,
}: ChatHeaderProps) {
  return (
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearChat}
          className="hover:bg-destructive/10 hover:text-destructive"
          title="Clear chat history"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
  );
} 