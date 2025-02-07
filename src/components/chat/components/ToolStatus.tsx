import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ToolStatusProps {
  activeTool: string | null;
  isVisible: boolean;
}

export function ToolStatus({ activeTool, isVisible }: ToolStatusProps) {
  const [isShowing, setIsShowing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (isVisible && activeTool) {
      setIsShowing(true);
      setIsCompleting(false);
    } else {
      setIsCompleting(true);
      const timer = setTimeout(() => setIsShowing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, activeTool]);

  if (!isShowing) return null;

  const getToolConfig = (tool: string) => {
    const configs = {
      createTask: {
        color: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
        icon: "✨",
        label: "Creating Task",
        responseEmoji: "✅",
        description: "Creating a new task for you"
      },
      getTasks: {
        color: "bg-sky-500/10 text-sky-500 ring-sky-500/20",
        icon: "📋",
        label: "Fetching Tasks",
        responseEmoji: "📊",
        description: "Retrieving your tasks"
      },
      deleteTask: {
        color: "bg-rose-500/10 text-rose-500 ring-rose-500/20",
        icon: "🗑️",
        label: "Deleting Task",
        responseEmoji: "🚫",
        description: "Removing the specified task"
      },
      searchTask: {
        color: "bg-violet-500/10 text-violet-500 ring-violet-500/20",
        icon: "🔍",
        label: "Searching Tasks",
        responseEmoji: "🎯",
        description: "Searching through your tasks"
      },
      updateTask: {
        color: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
        icon: "📝",
        label: "Updating Task",
        responseEmoji: "✨",
        description: "Updating task details"
      },
      dateTime: {
        color: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
        icon: "🕒",
        label: "Processing Time",
        responseEmoji: "⏰",
        description: "Processing date and time"
      },
      default: {
        color: "bg-slate-500/10 text-slate-500 ring-slate-500/20",
        icon: "🤖",
        label: "Processing",
        responseEmoji: "✨",
        description: "Processing your request"
      }
    };

    const type = Object.keys(configs).find(key => 
      tool.toLowerCase().replace(/tool$/, '') === key.toLowerCase()
    ) || 'default';
    
    return configs[type as keyof typeof configs];
  };

  const config = getToolConfig(activeTool || "");

  return (
    <div
      className={cn(
        "fixed left-1/2 top-4 z-50 -translate-x-1/2 transform",
        "flex flex-col items-center gap-1 rounded-lg px-4 py-2",
        "shadow-lg backdrop-blur-sm transition-all duration-500",
        "border border-primary/10",
        config.color,
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 -translate-y-full"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg transition-all duration-300">
            {isCompleting ? config.responseEmoji : config.icon}
          </span>
          {!isCompleting && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium tracking-wide">
                {config.label}
              </span>
            </div>
          )}
          {isCompleting && (
            <span className="text-sm font-medium tracking-wide animate-fade-in">
              Done
            </span>
          )}
        </div>
      </div>
      {!isCompleting && (
        <p className="text-xs text-muted-foreground animate-fade-in">
          {config.description}
        </p>
      )}
    </div>
  );
} 