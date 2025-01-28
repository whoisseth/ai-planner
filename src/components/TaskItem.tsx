"use client"

import { useState, useRef, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MoreHorizontal, Plus, Trash, Calendar, Edit, Info, ChevronDown, ChevronUp, Check, X, CheckCircle2, Clock, Link2, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { createSubtask, updateSubtask, deleteSubtask } from "@/app/actions/tasks"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TaskEditDialog } from "./TaskEditDialog"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import type { TaskData } from "@/types/task"
import { TaskDependenciesModal } from "@/components/TaskDependenciesModal"
import { Template } from "@/db/schema"
import { applyTemplate, getTemplates, createTemplate } from "@/services/templates"

export type Priority = "Low" | "Medium" | "High" | "Urgent"

export interface SubTask {
  id: string
  taskId: string
  title: string
  description: string | null
  completed: boolean
  createdAt: Date | null
  updatedAt: Date | null
  dueDate: Date | null
  dueTime: string | null
}

export interface TaskItemProps {
  task: TaskData
  onUpdate: (taskId: string, data: Partial<TaskData>) => void
  onDelete: (taskId: string) => void
  lists?: { id: string; name: string }[]
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>
  allTasks: TaskData[]
}

export function TaskItem({ task, onUpdate, onDelete, lists = [], onCreateList, allTasks }: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(task.dueDate || undefined)
  const [selectedTime, setSelectedTime] = useState(task.dueTime || "")
  const [isAllDay, setIsAllDay] = useState(!task.dueTime)
  const [editedTask, setEditedTask] = useState(task)
  const [newSubtask, setNewSubtask] = useState("")
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("")
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [quickAddSubtask, setQuickAddSubtask] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [tempTitle, setTempTitle] = useState(task.title)
  const [tempDescription, setTempDescription] = useState(task.description || "")
  const [editingSubtaskInline, setEditingSubtaskInline] = useState<string | null>(null)
  const [tempSubtaskTitle, setTempSubtaskTitle] = useState("")
  const [tempSubtaskDescription, setTempSubtaskDescription] = useState("")
  const [editingSubtaskDescription, setEditingSubtaskDescription] = useState<string | null>(null)
  const [isSubtaskDueDateDialogOpen, setIsSubtaskDueDateDialogOpen] = useState(false)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [showDependencies, setShowDependencies] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const subtaskTitleRef = useRef<HTMLDivElement>(null)
  const subtaskDescriptionRef = useRef<HTMLDivElement>(null)

  const handleStatusChange = () => {
    onUpdate(task.id, {
      completed: !task.completed,
      description: task.description,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      listId: task.listId,
    })
  }

  const handleSaveEdit = async (taskData: {
    title: string
    description?: string
    listId: string
    isAllDay?: boolean
    date?: string
    time?: string
    priority?: Priority
  }) => {
    try {
      await onUpdate(task.id, {
        title: taskData.title,
        description: taskData.description,
        listId: taskData.listId,
        dueDate: taskData.date ? new Date(taskData.date) : null,
        dueTime: taskData.time || null,
        priority: taskData.priority,
      })
      setIsEditDialogOpen(false)
      toast({
        title: "Task updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
      console.error("Failed to update task:", error)
    }
  }

  const handleAddSubtask = async (subtaskTitle: string, subtaskDescription = "") => {
    if (subtaskTitle.trim()) {
      try {
        const description = subtaskDescription.trim()
        const subtask = await createSubtask(task.id, subtaskTitle.trim(), description || undefined)
        onUpdate(task.id, {
          ...task,
          subtasks: [
            ...task.subtasks,
            {
              ...subtask,
              completed: false,
              description: description || null,
            },
          ],
        })
        setNewSubtask("")
        setNewSubtaskDescription("")
        setQuickAddSubtask("")
        setIsSubtaskDialogOpen(false)
        toast({
          title: "Subtask added successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add subtask",
          variant: "destructive",
        })
        console.error("Failed to add subtask:", error)
      }
    }
  }

  const handleSubtaskStatusChange = async (subtaskId: string) => {
    try {
      const subtask = task.subtasks.find((st) => st.id === subtaskId)
      if (subtask) {
        await updateSubtask(subtaskId, {
          completed: !subtask.completed,
          description: subtask.description,
        })
        onUpdate(task.id, {
          description: task.description,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          listId: task.listId,
          completed: task.completed,
          subtasks: task.subtasks.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st)),
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive",
      })
      console.error("Failed to update subtask:", error)
    }
  }

  const handleUpdateSubtask = async (subtaskId: string, data: Partial<SubTask>) => {
    try {
      await updateSubtask(subtaskId, data)
      onUpdate(task.id, {
        ...task,
        subtasks: task.subtasks.map((st) => (st.id === subtaskId ? { ...st, ...data } : st)),
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive",
      })
      console.error("Failed to update subtask:", error)
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId)
      onUpdate(task.id, {
        subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
      })
      toast({
        title: "Subtask deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subtask",
        variant: "destructive",
      })
      console.error("Failed to delete subtask:", error)
    }
  }

  const handleQuickAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickAddSubtask.trim()) {
      handleAddSubtask(quickAddSubtask)
    }
  }

  const handleTitleEdit = (e: React.MouseEvent) => {
    if (!editingTitle) {
      e.preventDefault()
      setEditingTitle(true)
      setTempTitle(task.title)
    }
  }

  const handleTitleBlur = async () => {
    const newTitle = titleRef.current?.textContent?.trim()
    if (newTitle && newTitle !== task.title) {
      await onUpdate(task.id, { ...task, title: newTitle })
    }
    setEditingTitle(false)
  }

  const handleDescriptionEdit = (e: React.MouseEvent) => {
    if (!editingDescription) {
      e.preventDefault()
      setEditingDescription(true)
      setTempDescription(task.description || "")
    }
  }

  const handleDescriptionBlur = async () => {
    const newDescription = descriptionRef.current?.textContent?.trim()
    await onUpdate(task.id, { ...task, description: newDescription || null })
    setEditingDescription(false)
  }

  const handleSubtaskTitleEdit = (subtaskId: string) => (e: React.MouseEvent) => {
    if (editingSubtaskInline !== subtaskId) {
      e.preventDefault()
      setEditingSubtaskInline(subtaskId)
      setTempSubtaskTitle(task.subtasks.find(st => st.id === subtaskId)?.title || "")
    }
  }

  const handleSubtaskTitleBlur = async (subtaskId: string) => {
    const newTitle = subtaskTitleRef.current?.textContent?.trim()
    if (newTitle) {
      const subtask = task.subtasks.find(st => st.id === subtaskId)
      await handleUpdateSubtask(subtaskId, {
        title: newTitle,
        description: subtask?.description || null
      })
    }
    setEditingSubtaskInline(null)
  }

  const handleSubtaskDescriptionBlur = async (subtaskId: string) => {
    const newDescription = subtaskDescriptionRef.current?.textContent?.trim()
    const subtask = task.subtasks.find(st => st.id === subtaskId)
    if (subtask) {
      await handleUpdateSubtask(subtaskId, {
        title: subtask.title,
        description: newDescription || null
      })
    }
    setEditingSubtaskDescription(null)
  }

  const handleUpdateSubtaskDueDate = async (subtaskId: string, date: Date | null, time: string | null) => {
    try {
      const subtask = task.subtasks.find(st => st.id === subtaskId)
      if (subtask) {
        await handleUpdateSubtask(subtaskId, {
          title: subtask.title,
          description: subtask.description,
          dueDate: date,
          dueTime: time
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subtask due date",
        variant: "destructive",
      })
      console.error("Failed to update subtask due date:", error)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      onUpdate(task.id, {
        dueDate: date,
        dueTime: isAllDay ? null : selectedTime || null
      });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setSelectedTime(time);
    if (selectedDate) {
      onUpdate(task.id, {
        dueTime: time || null,
        dueDate: selectedDate
      });
    }
  };

  const handleAllDayToggle = (checked: boolean) => {
    setIsAllDay(checked);
    if (selectedDate) {
      onUpdate(task.id, {
        dueDate: selectedDate,
        dueTime: checked ? null : selectedTime
      });
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      await applyTemplate(templateId, task.listId);
      // Refresh tasks after applying template
      onUpdate?.(task.id, {});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setIsCreatingTemplate(true);
      const template = await createTemplate({
        name: task.title,
        description: task.description || undefined,
        settings: {
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          defaultSubtasks: task.subtasks?.map((subtask) => ({
            title: subtask.title,
            description: subtask.description || undefined,
          })),
        },
        isPublic: false,
      });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(titleRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [editingTitle])

  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(descriptionRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [editingDescription])

  useEffect(() => {
    if (editingSubtaskInline && subtaskTitleRef.current) {
      subtaskTitleRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(subtaskTitleRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [editingSubtaskInline])

  useEffect(() => {
    if (editingSubtaskDescription && subtaskDescriptionRef.current) {
      subtaskDescriptionRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(subtaskDescriptionRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [editingSubtaskDescription])

  useEffect(() => {
    if (isTemplateDialogOpen) {
      const loadTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
          const templates = await getTemplates();
          setTemplates(templates);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load templates",
            variant: "destructive",
          });
        } finally {
          setIsLoadingTemplates(false);
        }
      };

      loadTemplates();
    }
  }, [isTemplateDialogOpen]);

  return (
    <div className="group relative flex flex-col gap-3 border-b border-border/40 py-3 last:border-b-0 hover:bg-accent/5 px-2 sm:px-3 transition-colors">
      <div className="flex items-start gap-3">
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative flex items-center justify-center pt-0.5 flex-shrink-0">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={handleStatusChange}
                  id={`task-${task.id}`}
                  className={cn(
                    "h-5 w-5 sm:h-[18px] sm:w-[18px] rounded-full border-2 transition-all duration-200 cursor-pointer",
                    task.completed
                      ? "bg-primary border-primary scale-105"
                      : "border-muted-foreground/20 hover:border-primary/50 group-hover:border-primary/50",
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-medium">
              Mark {task.completed ? "incomplete" : "completed"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer flex-shrink-0", {
                    "bg-red-100/90 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200/90 dark:hover:bg-red-900/60": task.priority === "Urgent",
                    "bg-yellow-100/90 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 hover:bg-yellow-200/90 dark:hover:bg-yellow-900/60": task.priority === "High",
                    "bg-blue-100/90 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200/90 dark:hover:bg-blue-900/60": task.priority === "Medium",
                    "bg-gray-100/90 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 hover:bg-gray-200/90 dark:hover:bg-gray-900/60": task.priority === "Low",
                  })}
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  {task.priority}
                </span>
                {(task.dueDate || task.dueTime) && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    <Calendar className="h-2.5 w-2.5" />
                    <span>
                      {task.dueDate && format(task.dueDate, "MMM d")}
                      {task.dueTime && format(new Date(`2000/01/01 ${task.dueTime}`), " h:mm a")}
                    </span>
                  </span>
                )}
              </div>
              <div
                ref={titleRef}
                contentEditable={editingTitle}
                onBlur={handleTitleBlur}
                onClick={handleTitleEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleTitleBlur()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    if (titleRef.current) titleRef.current.textContent = task.title
                    setEditingTitle(false)
                  }
                }}
                className={cn(
                  "text-sm font-medium leading-6 min-h-[24px] outline-none focus:outline-none focus-visible:outline-none",
                  "break-words whitespace-pre-wrap max-w-full cursor-text transition-all duration-200 rounded-sm py-0.5",
                  editingTitle ? "bg-accent/20 px-2 -mx-2 shadow-sm" : "px-0 hover:bg-accent/10 hover:px-2 hover:-mx-2",
                  task.completed && "text-muted-foreground/50 line-through",
                )}
                suppressContentEditableWarning
              >
                {task.title}
              </div>
              <div
                ref={descriptionRef}
                contentEditable={editingDescription}
                onBlur={handleDescriptionBlur}
                onClick={handleDescriptionEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleDescriptionBlur()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    if (descriptionRef.current) descriptionRef.current.textContent = task.description || ""
                    setEditingDescription(false)
                  }
                }}
                className={cn(
                  "text-sm min-h-[20px] outline-none focus:outline-none focus-visible:outline-none",
                  "break-words whitespace-pre-wrap max-w-full cursor-text transition-all duration-200 rounded-sm py-0.5",
                  editingDescription ? "bg-accent/20 px-2 -mx-2 shadow-sm" : "px-0 hover:bg-accent/10 hover:px-2 hover:-mx-2",
                  !task.description && !editingDescription && "text-muted-foreground/50 italic",
                  task.description ? "text-muted-foreground hover:text-foreground/70" : "hover:text-muted-foreground/70"
                )}
                data-placeholder="Add a description..."
                suppressContentEditableWarning
              >
                {task.description || (editingDescription ? "" : "Add a description...")}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="gap-2">
                    <Edit className="h-4 w-4" /> Edit task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSubtaskDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add subtask
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDetailsDialogOpen(true)} className="gap-2">
                    <Info className="h-4 w-4" /> View details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDependencies(true)} className="gap-2">
                    <Link2 className="h-4 w-4" /> Manage dependencies
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)} className="gap-2">
                    <Copy className="h-4 w-4" /> Apply Template
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCreateTemplate}
                    disabled={isCreatingTemplate}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {isCreatingTemplate ? "Creating Template..." : "Save as Template"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive gap-2">
                    <Trash className="h-4 w-4" /> Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 transition-opacity"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/70" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="pl-8 space-y-1">
          {task.subtasks.map((subtask) => (
            <div key={subtask.id} className="group flex items-start gap-3 -mx-2 px-2 py-1.5 rounded-md hover:bg-accent/10 transition-colors">
              <div className="pt-0.5 flex-shrink-0">
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={() => handleSubtaskStatusChange(subtask.id)}
                  id={`subtask-${subtask.id}`}
                  className={cn(
                    "h-4 w-4 rounded-full border-2 transition-all duration-200 cursor-pointer",
                    subtask.completed ? "bg-primary border-primary" : "border-muted-foreground/20",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div
                      ref={editingSubtaskInline === subtask.id ? subtaskTitleRef : undefined}
                      contentEditable={editingSubtaskInline === subtask.id}
                      onBlur={() => handleSubtaskTitleBlur(subtask.id)}
                      onClick={handleSubtaskTitleEdit(subtask.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSubtaskTitleBlur(subtask.id)
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          if (subtaskTitleRef.current) subtaskTitleRef.current.textContent = subtask.title
                          setEditingSubtaskInline(null)
                        }
                      }}
                      className={cn(
                        "text-sm leading-5 min-h-[20px] outline-none focus:outline-none focus-visible:outline-none",
                        "break-words whitespace-pre-wrap max-w-full cursor-text transition-all duration-75 rounded-sm py-0.5",
                        editingSubtaskInline === subtask.id ? "bg-accent/20 px-2 -mx-2 shadow-sm" : "px-0 hover:bg-accent/10 hover:px-2 hover:-mx-2",
                        editingSubtaskDescription === subtask.id ? "bg-accent/20 px-2 -mx-2 shadow-sm" : "px-0 hover:bg-accent/10 hover:px-2 hover:-mx-2",
                        subtask.completed && "text-muted-foreground/50 line-through"
                      )}
                      suppressContentEditableWarning
                    >
                      {subtask.title}
                    </div>
                    <div className="flex items-center gap-2">
                      {(subtask.dueDate || subtask.dueTime) && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <Calendar className="h-2.5 w-2.5" />
                          <span>
                            {subtask.dueDate && format(subtask.dueDate, "MMM d")}
                            {subtask.dueTime && format(new Date(`2000/01/01 ${subtask.dueTime}`), " h:mm a")}
                          </span>
                        </span>
                      )}
                      <div
                        ref={editingSubtaskDescription === subtask.id ? subtaskDescriptionRef : undefined}
                        contentEditable={editingSubtaskDescription === subtask.id}
                        onBlur={() => handleSubtaskDescriptionBlur(subtask.id)}
                        onClick={() => {
                          if (!editingSubtaskDescription) {
                            setEditingSubtaskDescription(subtask.id)
                            if (subtaskDescriptionRef.current) {
                              subtaskDescriptionRef.current.textContent = subtask.description || ""
                              requestAnimationFrame(() => {
                                if (subtaskDescriptionRef.current) {
                                  subtaskDescriptionRef.current.focus()
                                  const range = document.createRange()
                                  range.selectNodeContents(subtaskDescriptionRef.current)
                                  const selection = window.getSelection()
                                  selection?.removeAllRanges()
                                  selection?.addRange(range)
                                }
                              })
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubtaskDescriptionBlur(subtask.id)
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            if (subtaskDescriptionRef.current) {
                              subtaskDescriptionRef.current.textContent = subtask.description || ""
                            }
                            setEditingSubtaskDescription(null)
                          }
                        }}
                        className={cn(
                          "text-sm min-h-[20px] outline-none focus:outline-none focus-visible:outline-none",
                          "break-words whitespace-pre-wrap max-w-full cursor-text transition-all duration-75 rounded-sm py-0.5",
                          editingSubtaskDescription === subtask.id ? "bg-accent/20 px-2 -mx-2 shadow-sm" : "px-0 hover:bg-accent/10 hover:px-2 hover:-mx-2",
                          !subtask.description && !editingSubtaskDescription && "text-muted-foreground/50 italic",
                          subtask.description ? "text-muted-foreground hover:text-foreground/70" : "hover:text-muted-foreground/70"
                        )}
                        suppressContentEditableWarning
                      >
                        {subtask.description || (!editingSubtaskDescription ? "Add a description..." : "")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground/70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setEditingSubtaskInline(subtask.id)} className="gap-2">
                          <Edit className="h-4 w-4" /> Edit subtask
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedSubtaskId(subtask.id)
                            setIsSubtaskDueDateDialogOpen(true)
                          }} 
                          className="gap-2"
                        >
                          <Calendar className="h-4 w-4" /> Set due date
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteSubtask(subtask.id)} className="text-destructive gap-2">
                          <Trash className="h-4 w-4" /> Delete subtask
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-1">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 group/input">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground/50 transition-colors group-focus-within/input:text-primary/70" />
                </div>
                <Input
                  placeholder="Add a quick subtask..."
                  value={quickAddSubtask}
                  onChange={(e) => setQuickAddSubtask(e.target.value)}
                  onKeyDown={handleQuickAddSubtask}
                  className={cn(
                    "h-8 text-sm pl-8 pr-16 bg-transparent transition-colors",
                    "border-muted hover:border-input focus:border-input",
                    "placeholder:text-muted-foreground/50",
                    quickAddSubtask.trim() && "pr-20"
                  )}
                />
                {quickAddSubtask.trim() && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                      onClick={() => handleAddSubtask(quickAddSubtask)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setQuickAddSubtask("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                onClick={() => setIsSubtaskDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Details
              </Button>
            </div>
          </div>
        </div>
      )}

      <TaskEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={task}
        lists={lists}
        onUpdate={handleSaveEdit}
        onCreateList={onCreateList}
      />

      <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
          <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-xl font-semibold">Add Subtask</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-6 p-4">
              <div className="grid gap-2">
                <Input
                  id="subtask"
                  placeholder="Enter subtask title"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleAddSubtask(newSubtask, newSubtaskDescription)
                    }
                  }}
                  className="h-12"
                />
              </div>
              <div className="grid gap-2">
                <Textarea
                  id="subtaskDescription"
                  placeholder="Add description"
                  value={newSubtaskDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSubtaskDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t mt-auto">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setIsSubtaskDialogOpen(false)} className="flex-1 ">
                Cancel
              </Button>
              <Button
                onClick={() => handleAddSubtask(newSubtask, newSubtaskDescription)}
                disabled={!newSubtask.trim()}
                className="flex-1 "
              >
                Add Subtask
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
          <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-xl font-semibold">Task Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
                <p className="mt-1 text-sm">{task.title}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="mt-1 text-sm">{task.description || "No description"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                <p className="mt-1 text-sm">{task.priority}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                <p className="mt-1 text-sm">{task.dueDate ? format(task.dueDate, "MMMM d, yyyy") : "No due date"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Due Time</h3>
                <p className="mt-1 text-sm">
                  {task.dueTime ? format(new Date(`2000/01/01 ${task.dueTime}`), "h:mm a") : "No due time"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Subtasks</h3>
                <ul className="mt-1 space-y-2">
                  {task.subtasks.length > 0 ? (
                    task.subtasks.map((subtask) => (
                      <li key={subtask.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => handleSubtaskStatusChange(subtask.id)}
                          id={`details-subtask-${subtask.id}`}
                          className="h-4 w-4"
                        />
                        <label
                          htmlFor={`details-subtask-${subtask.id}`}
                          className={cn("text-sm", subtask.completed && "line-through text-muted-foreground")}
                        >
                          {subtask.title}
                        </label>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No subtasks</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t mt-auto">
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubtaskDueDateDialogOpen} onOpenChange={setIsSubtaskDueDateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
          <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
            <DialogTitle className="text-xl font-semibold">Set Due Date</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-6 p-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                <Label htmlFor="date">Due Date</Label>
                  <div className="flex items-center gap-2">
                <Input
                  type="date"
                  id="date"
                  value={task.subtasks.find(st => st.id === selectedSubtaskId)?.dueDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    if (selectedSubtaskId) {
                          const date = e.target.value ? new Date(e.target.value) : null
                          handleUpdateSubtaskDueDate(selectedSubtaskId, date, task.subtasks.find(st => st.id === selectedSubtaskId)?.dueTime || null)
                        }
                      }}
                      className="flex-1"
                    />
                    {task.subtasks.find(st => st.id === selectedSubtaskId)?.dueDate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (selectedSubtaskId) {
                            handleUpdateSubtaskDueDate(selectedSubtaskId, null, task.subtasks.find(st => st.id === selectedSubtaskId)?.dueTime || null)
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
              </div>
                </div>
                <div className="flex flex-col gap-2">
                <Label htmlFor="time">Due Time</Label>
                  <div className="flex items-center gap-2">
                <Input
                  type="time"
                  id="time"
                  value={task.subtasks.find(st => st.id === selectedSubtaskId)?.dueTime || ''}
                  onChange={(e) => {
                    if (selectedSubtaskId) {
                          handleUpdateSubtaskDueDate(
                            selectedSubtaskId,
                            task.subtasks.find(st => st.id === selectedSubtaskId)?.dueDate || null,
                            e.target.value || null
                          )
                        }
                      }}
                      className="flex-1"
                    />
                    {task.subtasks.find(st => st.id === selectedSubtaskId)?.dueTime && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (selectedSubtaskId) {
                            handleUpdateSubtaskDueDate(
                              selectedSubtaskId,
                              task.subtasks.find(st => st.id === selectedSubtaskId)?.dueDate || null,
                              null
                            )
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t mt-auto">
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setIsSubtaskDueDateDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsSubtaskDueDateDialogOpen(false)
                }}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDependenciesModal
        task={task}
        isOpen={showDependencies}
        onClose={() => setShowDependencies(false)}
        allTasks={allTasks}
      />

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingTemplates ? (
              <div className="flex justify-center">
                <span>Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center">
                <p className="text-muted-foreground">No templates available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 hover:bg-secondary rounded-md"
                  >
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApplyTemplate(template.id)}
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

