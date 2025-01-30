"use client";

import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { SubTaskData } from "@/types/task";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SubtaskItemProps {
  subtask: SubTaskData;
  onStatusChange: (subtaskId: string) => void;
  onUpdate: (subtaskId: string, data: Partial<SubTaskData>) => void;
  onDelete: (subtaskId: string) => void;
  onSetDueDate: (subtaskId: string) => void;
  isDragging?: boolean;
}

export function SubtaskItem({
  subtask,
  onStatusChange,
  onUpdate,
  onDelete,
  onSetDueDate,
  isDragging,
}: SubtaskItemProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: subtask.id,
    data: subtask,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleBlur = () => {
    const newTitle = titleRef.current?.textContent?.trim();
    if (newTitle && newTitle !== subtask.title) {
      onUpdate(subtask.id, {
        title: newTitle,
        description: subtask.description,
      });
    }
    setEditingTitle(false);
  };

  const handleDescriptionBlur = () => {
    const newDescription = descriptionRef.current?.textContent?.trim();
    onUpdate(subtask.id, {
      title: subtask.title,
      description: newDescription || null,
    });
    setEditingDescription(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group -mx-2 flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/10",
        (isDragging || isSortableDragging) && "opacity-50",
        "touch-none",
      )}
    >
      <div
        className="flex-shrink-0 cursor-grab pt-0.5 active:cursor-grabbing"
        {...listeners}
      >
        <Checkbox
          checked={subtask.completed}
          onCheckedChange={() => onStatusChange(subtask.id)}
          id={`subtask-${subtask.id}`}
          className={cn(
            "h-4 w-4 cursor-pointer rounded-full border-2 transition-all duration-200",
            subtask.completed
              ? "border-primary bg-primary"
              : "border-muted-foreground/20",
          )}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div
              ref={titleRef}
              contentEditable={editingTitle}
              onBlur={handleTitleBlur}
              onClick={() => !editingTitle && setEditingTitle(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleTitleBlur();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  if (titleRef.current)
                    titleRef.current.textContent = subtask.title;
                  setEditingTitle(false);
                }
              }}
              className={cn(
                "min-h-[20px] text-sm leading-5 outline-none focus:outline-none focus-visible:outline-none",
                "max-w-full cursor-text whitespace-pre-wrap break-words rounded-sm py-0.5 transition-all duration-75",
                editingTitle
                  ? "-mx-2 bg-accent/20 px-2 shadow-sm"
                  : "px-0 hover:-mx-2 hover:bg-accent/10 hover:px-2",
                subtask.completed && "text-muted-foreground/50 line-through",
              )}
              suppressContentEditableWarning
            >
              {subtask.title}
            </div>
            <div className="flex items-center gap-2">
              {(subtask.dueDate || subtask.dueTime) && (
                <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground/80">
                  <Calendar className="h-2.5 w-2.5" />
                  <span>
                    {subtask.dueDate && format(subtask.dueDate, "MMM d")}
                    {subtask.dueTime &&
                      format(
                        new Date(`2000/01/01 ${subtask.dueTime}`),
                        " h:mm a",
                      )}
                  </span>
                </span>
              )}
              <div
                ref={descriptionRef}
                contentEditable={editingDescription}
                onBlur={handleDescriptionBlur}
                onClick={() =>
                  !editingDescription && setEditingDescription(true)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleDescriptionBlur();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    if (descriptionRef.current) {
                      descriptionRef.current.textContent =
                        subtask.description || "";
                    }
                    setEditingDescription(false);
                  }
                }}
                className={cn(
                  "min-h-[20px] text-sm outline-none focus:outline-none focus-visible:outline-none",
                  "max-w-full cursor-text whitespace-pre-wrap break-words rounded-sm py-0.5 transition-all duration-75",
                  editingDescription
                    ? "-mx-2 bg-accent/20 px-2 shadow-sm"
                    : "px-0 hover:-mx-2 hover:bg-accent/10 hover:px-2",
                  !subtask.description &&
                    !editingDescription &&
                    "italic text-muted-foreground/50",
                  subtask.description
                    ? "text-muted-foreground hover:text-foreground/70"
                    : "hover:text-muted-foreground/70",
                  "w-full",
                )}
                suppressContentEditableWarning
              >
                {subtask.description ||
                  (!editingDescription ? "Add a description..." : "")}
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground/70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setEditingTitle(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" /> Edit subtask
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSetDueDate(subtask.id)}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" /> Set due date
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(subtask.id)}
                  className="gap-2 text-destructive"
                >
                  <Trash className="h-4 w-4" /> Delete subtask
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
