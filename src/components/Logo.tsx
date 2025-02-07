import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  forceShowText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  variant?: "white" | "gradient";
}

export function Logo({
  className,
  showText = true,
  forceShowText = false,
  size = "md",
  href = "/",
  variant = "white",
}: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const Component = href ? Link : "div";

  return (
    <Component
      href={href as string}
      className={cn(
        "group inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-90",
        sizeClasses[size],
        className,
      )}
    >
      <Sparkles
        className={cn(
          iconSizes[size],
          "text-purple-500 transition-transform duration-300 group-hover:rotate-12",
          "shrink-0",
        )}
      />
      {showText && (
        <span
          className={cn(
            variant === "gradient"
              ? "bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent"
              : "text-white",
            !forceShowText && "hidden md:block",
          )}
        >
          AI Planner
        </span>
      )}
    </Component>
  );
}
