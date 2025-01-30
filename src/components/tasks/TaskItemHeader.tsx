"use client";

import { useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Plus,
  Info,
  Copy,
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
  isCreatingTemplate,
  onStatusChange,
  onEdit,
  onAddSubtask,
  onViewDetails,
  onApplyTemplate,
  onCreateTemplate,
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
    e.preventDefault();
    onTitleEdit();
  };

  const handleDescriptionBlur = () => {
    const newDescription = descriptionRef.current?.textContent?.trim();
    onDescriptionEdit(newDescription || null);
  };

  return (
    <div className="flex items-start gap-3">
      <div className="relative flex flex-shrink-0 items-center justify-center pt-0.5">
        <Checkbox
          checked={task.completed}
          onCheckedChange={onStatusChange}
          id={`task-${task.id}`}
          className={cn(
            "h-5 w-5 cursor-pointer rounded-full border-2 transition-all duration-200 sm:h-[18px] sm:w-[18px]",
            task.completed
              ? "scale-105 border-primary bg-primary"
              : "border-muted-foreground/20 hover:border-primary/50 group-hover:border-primary/50",
          )}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span
                className={cn(
                  "flex-shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  {
                    "bg-red-100/90 text-red-700 hover:bg-red-200/90 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60":
                      task.priority === "Urgent",
                    "bg-yellow-100/90 text-yellow-700 hover:bg-yellow-200/90 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/60":
                      task.priority === "High",
                    "bg-blue-100/90 text-blue-700 hover:bg-blue-200/90 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60":
                      task.priority === "Medium",
                    "bg-gray-100/90 text-gray-700 hover:bg-gray-200/90 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-900/60":
                      task.priority === "Low",
                  },
                )}
                onClick={onEdit}
              >
                {task.priority}
              </span>
              {(task.dueDate || task.dueTime) && (
                <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground/80">
                  <Calendar className="h-2.5 w-2.5" />
                  <span>
                    {task.dueDate && format(task.dueDate, "MMM d")}
                    {task.dueTime &&
                      format(new Date(`2000/01/01 ${task.dueTime}`), " h:mm a")}
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2">
                {editingTitle ? (
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onBlur={onTitleBlur}
                    className={cn(
                      "w-full bg-transparent text-base font-medium leading-none",
                      "focus:outline-none focus-visible:outline-none",
                      task.completed && "text-muted-foreground/50 line-through",
                    )}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleTitleClick}
                    className={cn(
                      "w-full cursor-text text-left text-base font-medium leading-none",
                      task.completed && "text-muted-foreground/50 line-through",
                    )}
                  >
                    {task.title}
                  </button>
                )}
              </div>
            </div>
            <div
              ref={descriptionRef}
              contentEditable
              onBlur={handleDescriptionBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleDescriptionBlur();
                }
              }}
              className={cn(
                "min-h-[20px] text-sm outline-none focus:outline-none focus-visible:outline-none",
                "max-w-full cursor-text whitespace-pre-wrap break-words rounded-sm py-0.5 transition-all duration-200",
                "px-0 hover:-mx-2 hover:bg-accent/10 hover:px-2",
                !task.description && "italic text-muted-foreground/50",
                task.description
                  ? "text-muted-foreground hover:text-foreground/70"
                  : "hover:text-muted-foreground/70",
              )}
              suppressContentEditableWarning
            >
              {task.description || "Add a description..."}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-opacity"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground/70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Edit className="h-4 w-4" /> Edit task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddSubtask} className="gap-2">
                  <Plus className="h-4 w-4" /> Add subtask
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewDetails} className="gap-2">
                  <Info className="h-4 w-4" /> View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onApplyTemplate} className="gap-2">
                  <Copy className="h-4 w-4" /> Apply Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onCreateTemplate}
                  disabled={isCreatingTemplate}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {isCreatingTemplate
                    ? "Creating Template..."
                    : "Save as Template"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="gap-2 text-destructive"
                >
                  <Trash className="h-4 w-4" /> Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
