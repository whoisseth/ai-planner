"use client"

import React from "react"
import { getTasks, createTask, updateTask, deleteTask } from "../actions/tasks"
import { createList, getLists } from "../actions/lists"
import type { TaskData, ListData } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskItem } from "@/components/TaskItem"
import { ListTodo, CheckCircle2, Star, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TaskDialog } from "@/components/TaskDialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

export default function DashboardPage() {
  const [tasks, setTasks] = React.useState<TaskData[]>([])
  const [lists, setLists] = React.useState<ListData[]>([])
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const loadData = async () => {
      const [tasksData, listsData] = await Promise.all([getTasks(), getLists()])
      setTasks(tasksData)
      setLists(listsData)
    }
    loadData()
  }, [])

  const handleCreateTask = async (taskData: {
    title: string
    description?: string
    listId: string
    isAllDay?: boolean
    date?: string
    time?: string
    priority?: "Low" | "Medium" | "High" | "Urgent"
  }) => {
    try {
      const task = await createTask(taskData.listId, {
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.date ? new Date(taskData.date) : null,
        dueTime: taskData.time || null,
        priority: taskData.priority,
      })
      setTasks((prev) => [...prev, task])
      setIsOpen(false)
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }

  const handleUpdateTask = async (taskId: string, data: Partial<TaskData>) => {
    try {
      const { subtasks, ...updateData } = data
      const taskToUpdate = tasks.find((t) => t.id === taskId)
      if (!taskToUpdate) return

      const updatedTask = await updateTask(taskId, {
        ...updateData,
        listId: updateData.listId || taskToUpdate.listId,
      })

      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const handleCreateList = async (name: string) => {
    try {
      const newList = await createList(name)
      setLists((prev) => [...prev, newList])
      return newList
    } catch (error) {
      console.error("Error creating list:", error)
      throw error
    }
  }

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)
  const starredTasks = tasks.filter((t) => t.starred)
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0

  const priorityBreakdown = tasks.reduce(
    (acc, task) => {
      if (task.priority) {
        acc[task.priority]++
      }
      return acc
    },
    { Low: 0, Medium: 0, High: 0, Urgent: 0 } as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky  h-14 top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center px-2 md:px-4">
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <div className="flex items-center gap-1 md:gap-2">
              <TaskStat
                icon={<ListTodo className="h-4 w-4" />}
                count={activeTasks.length}
                label="active"
                color="text-blue-500"
              />
              <TaskStat
                icon={<CheckCircle2 className="h-4 w-4" />}
                count={Math.round(completionRate)}
                label="done"
                suffix="%"
                color="text-green-500"
              />
              <TaskStat
                icon={<Star className="h-4 w-4" />}
                count={starredTasks.length}
                label="starred"
                color="text-yellow-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 border-l pl-2">
              {Object.entries(priorityBreakdown)
                .sort(([a], [b]) => {
                  const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
                  return order[a as keyof typeof order] - order[b as keyof typeof order]
                })
                .map(([priority, count]) => (
                  <PriorityDot
                    key={priority}
                    priority={priority as "Urgent" | "High" | "Medium" | "Low"}
                    count={count}
                    pendingCount={tasks.filter((t) => t.priority === priority && !t.completed).length}
                  />
                ))}
            </div>
            <Button onClick={() => setIsOpen(true)} size="icon" variant="outline" className="h-8 w-8">
              <PlusCircle className="h-4 w-4" />
              <span className="sr-only">Add Task</span>
            </Button>
          </div>
        </div>
      </header>

      <TaskDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onCreateTask={handleCreateTask}
        onCreateList={handleCreateList}
        lists={lists}
      />

      <main className="p-2 md:p-4">
        <Card className="bg-card border-0 shadow-none">
          <CardHeader className="px-2 pb-2 pt-4 md:p-4">
            <CardTitle className="text-xl">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent className="px-2 md:px-4">
            <div className="space-y-3">
              {tasks
                .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
                .slice(0, 5)
                .map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    lists={lists}
                    onCreateList={handleCreateList}
                  />
                ))}
              {tasks.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No tasks yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

interface TaskStatProps {
  icon: React.ReactElement
  count: number
  label: string
  suffix?: string
  color: string
}

function TaskStat({ icon, count, label, suffix = "", color }: TaskStatProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-1 md:px-2 gap-1">
            {React.cloneElement(icon, {
              className: cn(icon.props.className, count > 0 ? color : "text-muted-foreground"),
            })}
            <span className={cn("tabular-nums text-sm", count > 0 ? "" : "text-muted-foreground")}>
              {count}
              {suffix}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          {count > 0 ? `${count} ${label} tasks` : `No ${label} tasks`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface PriorityDotProps {
  priority: "Urgent" | "High" | "Medium" | "Low"
  count: number
  pendingCount: number
}

function PriorityDot({ priority, count, pendingCount }: PriorityDotProps) {
  const priorityColor =
    priority === "Urgent"
      ? "rgb(239 68 68)"
      : priority === "High"
        ? "rgb(249 115 22)"
        : priority === "Medium"
          ? "rgb(234 179 8)"
          : "rgb(34 197 94)"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", pendingCount > 0 ? "text-foreground" : "text-muted-foreground")}
          >
            <div className="flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: priorityColor,
                  opacity: pendingCount > 0 ? 1 : 0.4,
                }}
              />
              <span
                className="text-xs tabular-nums"
                style={{
                  color: pendingCount > 0 ? priorityColor : "inherit",
                }}
              >
                {pendingCount > 0 ? pendingCount : count}
              </span>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" className="text-xs" style={{ color: priorityColor }}>
          {pendingCount > 0 ? (
            <span>
              {pendingCount} {priority.toLowerCase()} priority
            </span>
          ) : (
            <span>All {priority.toLowerCase()} priority complete</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

