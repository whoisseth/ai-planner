"use client";

import { useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Plus,
  Info,
  Trash,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { TaskItemHeaderProps } from "@/types/TaskItemTypes";

export function TaskItemHeader({
  task,
  editingTitle,
  tempTitle,
  isExpanded,
  onStatusChange,
  onEdit,
  onAddSubtask,
  onViewDetails,
  onDelete,
  onToggleExpand,
  onTitleEdit,
  onTitleChange,
  onTitleBlur,
  onDescriptionEdit,
}: TaskItemHeaderProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!editingTitle && titleRef.current?.contains(e.target as Node)) {
      onTitleEdit();
    }
  };

  const handleDescriptionBlur = () => {
    const newDescription = descriptionRef.current?.textContent?.trim();
    onDescriptionEdit(newDescription || null);
  };

  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="flex items-center pt-0.5">
        <Checkbox checked={task.completed} onCheckedChange={onStatusChange} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          ref={titleRef}
          className={cn(
            "text-sm font-medium leading-5 outline-none",
            task.completed && "text-muted-foreground line-through",
            "focus:outline-none",
          )}
          onClick={handleTitleClick}
          contentEditable={editingTitle}
          onBlur={onTitleBlur}
          onInput={(e) => onTitleChange(e.currentTarget.textContent || "")}
          suppressContentEditableWarning={true}
          role="textbox"
          aria-label="Task title"
        >
          {task.title}
        </div>
        <div
          ref={descriptionRef}
          className="mt-0.5 text-sm text-muted-foreground outline-none"
          contentEditable
          onBlur={handleDescriptionBlur}
          suppressContentEditableWarning={true}
          role="textbox"
          aria-label="Task description"
        >
          {task.description}
        </div>
        {task.dueDate && (
          <div className="mt-1.5 flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            {format(new Date(task.dueDate), "PPP")}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddSubtask}>
              <Plus className="mr-2 h-4 w-4" />
              Add subtask
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewDetails}>
              <Info className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
