"use client"

import { useState } from 'react'
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, Trash, Calendar, Edit, Info } from 'lucide-react'
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from 'date-fns'
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type SubTask = {
  id: string
  title: string
  completed: boolean
}

export type Task = {
  id: string
  title: string
  completed: boolean
  priority: Priority
  dueDate?: Date
  dueTime?: string
  subtasks: SubTask[]
}

interface TaskItemProps {
  task: Task
  onUpdate: (task: Task) => void
  onDelete: (id: string) => void
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [editedTask, setEditedTask] = useState(task)
  const [newSubtask, setNewSubtask] = useState('')
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState('')

  const handleStatusChange = () => {
    onUpdate({ ...task, completed: !task.completed })
  }

  const handleSaveEdit = () => {
    onUpdate(editedTask)
    setIsEditDialogOpen(false)
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const newSubtaskItem: SubTask = {
        id: Math.random().toString(36).substr(2, 9),
        title: newSubtask,
        completed: false
      }
      onUpdate({
        ...task,
        subtasks: [...task.subtasks, newSubtaskItem]
      })
      setNewSubtask('')
      setIsSubtaskDialogOpen(false)
    }
  }

  const handleSubtaskStatusChange = (subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    onUpdate({ ...task, subtasks: updatedSubtasks })
  }

  const handleEditSubtask = (subtaskId: string) => {
    const subtask = task.subtasks.find(st => st.id === subtaskId)
    if (subtask) {
      setEditingSubtaskId(subtaskId)
      setEditedSubtaskTitle(subtask.title)
    }
  }

  const handleSaveSubtaskEdit = () => {
    if (editingSubtaskId) {
      const updatedSubtasks = task.subtasks.map(st =>
        st.id === editingSubtaskId ? { ...st, title: editedSubtaskTitle } : st
      )
      onUpdate({ ...task, subtasks: updatedSubtasks })
      setEditingSubtaskId(null)
      setEditedSubtaskTitle('')
    }
  }

  return (
    <div className="group flex items-start gap-2 py-2 border-b last:border-b-0">
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleStatusChange}
        id={`task-${task.id}`}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </label>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            {
              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': task.priority === 'Urgent',
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': task.priority === 'High',
              'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': task.priority === 'Medium',
              'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300': task.priority === 'Low',
            }
          )}>
            {task.priority}
          </span>
        </div>
        {(task.dueDate || task.dueTime) && (
          <div className="flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {task.dueDate && format(task.dueDate, 'MMM d, yyyy')}
              {task.dueTime && ` at ${task.dueTime}`}
            </span>
          </div>
        )}
        {task.subtasks.length > 0 && (
          <div className="ml-4 mt-2 space-y-1">
            {task.subtasks.map(subtask => (
              <div key={subtask.id} className="flex items-center gap-2">
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={() => handleSubtaskStatusChange(subtask.id)}
                  id={`subtask-${subtask.id}`}
                  className="h-3 w-3"
                />
                <label
                  htmlFor={`subtask-${subtask.id}`}
                  className={cn(
                    "text-xs flex-grow",
                    subtask.completed && "line-through text-muted-foreground"
                  )}
                >
                  {subtask.title}
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEditSubtask(subtask.id)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setIsSubtaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add subtask
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDetailsDialogOpen(true)}>
            <Info className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => onDelete(task.id)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Make changes to your task here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={editedTask.priority}
                onValueChange={(value: Priority) => setEditedTask({ ...editedTask, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={editedTask.dueDate ? format(editedTask.dueDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={editedTask.dueTime || ''}
                onChange={(e) => setEditedTask({ ...editedTask, dueTime: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Subtask</DialogTitle>
            <DialogDescription>
              Add a new subtask to "{task.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subtask">Subtask Title</Label>
              <Input
                id="subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddSubtask}>Add subtask</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="font-bold">Title</Label>
              <p>{task.title}</p>
            </div>
            <div>
              <Label className="font-bold">Priority</Label>
              <p>{task.priority}</p>
            </div>
            <div>
              <Label className="font-bold">Due Date</Label>
              <p>{task.dueDate ? format(task.dueDate, 'MMMM d, yyyy') : 'Not set'}</p>
            </div>
            <div>
              <Label className="font-bold">Due Time</Label>
              <p>{task.dueTime || 'Not set'}</p>
            </div>
            <div>
              <Label className="font-bold">Status</Label>
              <p>{task.completed ? 'Completed' : 'Active'}</p>
            </div>
            {task.subtasks.length > 0 && (
              <div>
                <Label className="font-bold">Subtasks</Label>
                <ul className="list-disc pl-5">
                  {task.subtasks.map(subtask => (
                    <li key={subtask.id} className={subtask.completed ? 'line-through' : ''}>
                      {subtask.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingSubtaskId} onOpenChange={() => setEditingSubtaskId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subtask</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editSubtask">Subtask Title</Label>
              <Input
                id="editSubtask"
                value={editedSubtaskTitle}
                onChange={(e) => setEditedSubtaskTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSubtaskEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

