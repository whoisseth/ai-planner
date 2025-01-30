"use client";

import { useRef } from "react";
import { TaskItemContentProps } from "@/types/TaskItemTypes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function TaskItemContent({
  task,
  isExpanded,
  editingDescription,
  tempDescription,
  onDescriptionEdit,
  onDescriptionChange,
  onDescriptionBlur,
}: TaskItemContentProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? "auto" : 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 py-2">
        <div
          ref={descriptionRef}
          onClick={onDescriptionEdit}
          className={cn(
            "cursor-text text-sm text-muted-foreground/80",
            "transition-colors hover:text-muted-foreground bg-red-500",
            !task.description && "italic text-muted-foreground/50",
          )}
        >
          {task.description || "Add a description..."}
        </div>
      </div>
    </motion.div>
  );
}
