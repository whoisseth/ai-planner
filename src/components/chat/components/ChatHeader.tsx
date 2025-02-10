import React from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X, Trash2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useGroqSettings } from "@/store/groq-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatHeaderProps {
  isFullScreen: boolean;
  isMobile: boolean;
  setIsFullScreen: (value: boolean) => void;
  setIsOpen: (value: boolean) => void;
  setWidth: (value: number) => void;
  onClearChat: () => void;
  onToggleExpand: () => void;
  hasChatMessages: boolean;
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
  onToggleExpand,
  hasChatMessages,
}: ChatHeaderProps) {
  const { useCustomKey, apiKey, isLoading, toggleCustomKey, initSettings } =
    useGroqSettings();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Initialize settings on component mount
  React.useEffect(() => {
    initSettings();
  }, [initSettings]);

  const handleDelete = () => {
    onClearChat();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between border-b p-4",
          isFullScreen && !isMobile && "px-8 py-4",
        )}
      >
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "text-lg font-semibold",
              isFullScreen && !isMobile && "text-xl",
            )}
          >
            AI Assistant
          </h3>
          {!isLoading && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-4 flex items-center gap-2">
                    <KeyRound
                      className={cn(
                        "h-4 w-4",
                        !apiKey ? "text-destructive" : "text-muted-foreground",
                      )}
                    />
                    <Switch
                      id="custom-key-toggle"
                      checked={useCustomKey}
                      onCheckedChange={toggleCustomKey}
                      disabled={!apiKey}
                      className={cn(
                        "scale-75",
                        apiKey
                          ? "data-[state=checked]:bg-primary"
                          : "cursor-not-allowed opacity-50",
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!apiKey
                    ? "Please add your API key in settings to use the chat"
                    : "Toggle custom API key"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    title="Clear chat history"
                    disabled={!hasChatMessages || !apiKey}
                    className={cn(
                      (!hasChatMessages || !apiKey) &&
                        "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!apiKey
                  ? "Please add your API key in settings to use the chat"
                  : !hasChatMessages
                    ? "No messages to clear"
                    : "Clear chat history"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isFullScreen ? "default" : "icon"}
                    onClick={() => {
                      setIsFullScreen(!isFullScreen);
                      if (!isFullScreen) {
                        setWidth(500);
                      }
                    }}
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
                </TooltipTrigger>
                <TooltipContent>
                  {isFullScreen
                    ? "Exit fullscreen mode"
                    : "Enter fullscreen mode"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsOpen(false);
                    setIsFullScreen(false);
                    setWidth(500);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Chat History</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear your chat history? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
