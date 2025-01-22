import { AddTaskButton } from "../components/AddTaskDialog";
import { TaskList } from "../components/TaskList";
import { getTasks } from "@/app/actions/tasks";
import { Task } from "@/components/TaskItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function TasksPage() {
  const tasks = await getTasks();

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <AddTaskButton />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <TaskList tasks={tasks as Task[]} />
        </TabsContent>
        <TabsContent value="active">
          <TaskList tasks={activeTasks as Task[]} />
        </TabsContent>
        <TabsContent value="completed">
          <TaskList tasks={completedTasks as Task[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
