import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTaskButton } from "./components/AddTaskDialog";
import { TaskList } from "./components/TaskList";
import { getTasks } from "@/app/actions/tasks";
import { Task } from "@/components/TaskItem";
import { Target } from "lucide-react";
import { BarChart2 } from "lucide-react";
import { Clock } from "lucide-react";

export default async function Dashboard() {
  const tasks = await getTasks();

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-4 pb-16 lg:pb-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Active Tasks</CardTitle>
          <AddTaskButton />
        </CardHeader>
        <CardContent>
          <TaskList tasks={activeTasks as Task[]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Completed Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList tasks={completedTasks as Task[]} />
        </CardContent>
      </Card>
      {/* ===== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productivity Score
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">+2% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Utilized</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5h 23m</div>
            <p className="text-xs text-muted-foreground">Out of 8 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Focus Area</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Project Work</div>
            <p className="text-xs text-muted-foreground">Suggested by AI</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
