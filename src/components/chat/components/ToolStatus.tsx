import { cn } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";
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
      const timer = setTimeout(() => setIsShowing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, activeTool]);

  if (!isShowing) return null;

  const getToolConfig = (tool: string) => {
    const configs = {
      create: {
        color: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
        icon: "✨",
        label: "Creating",
        responseEmoji: "✅"
      },
      get: {
        color: "bg-sky-500/10 text-sky-500 ring-sky-500/20",
        icon: "📋",
        label: "Fetching",
        responseEmoji: "📊"
      },
      delete: {
        color: "bg-rose-500/10 text-rose-500 ring-rose-500/20",
        icon: "🗑️",
        label: "Deleting",
        responseEmoji: "🚫"
      },
      search: {
        color: "bg-violet-500/10 text-violet-500 ring-violet-500/20",
        icon: "🔍",
        label: "Searching",
        responseEmoji: "🎯"
      },
      update: {
        color: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
        icon: "📝",
        label: "Updating",
        responseEmoji: "✨"
      },
      default: {
        color: "bg-slate-500/10 text-slate-500 ring-slate-500/20",
        icon: "🤖",
        label: "Processing",
        responseEmoji: "✨"
      }
    };

    const type = Object.keys(configs).find(key => tool.toLowerCase().includes(key)) || 'default';
    return configs[type as keyof typeof configs];
  };

  const config = getToolConfig(activeTool || "");

  return (
    <div
      className={cn(
        "fixed left-1/2 top-4 z-50 -translate-x-1/2 transform",
        "flex items-center gap-2 rounded-full px-4 py-1.5",
        "shadow-lg backdrop-blur-sm transition-all duration-300",
        "border border-primary/10",
        config.color,
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 -translate-y-full"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-base transition-all duration-300">
            {isCompleting ? config.responseEmoji : config.icon}
          </span>
          {!isCompleting && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        <span className="text-xs font-medium tracking-wide">
          {isCompleting ? "Done" : config.label}
        </span>
      </div>
    </div>
  );
} 