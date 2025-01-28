import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskData } from "@/types/task";
import { TaskDependency } from "@/db/schema";
import {
  addTaskDependency,
  removeTaskDependency,
  getTaskDependencies,
} from "@/services/tasks/dependencies";
import { useToast } from "@/components/ui/use-toast";
import { Search, X } from "lucide-react";

interface TaskDependenciesModalProps {
  task: TaskData;
  isOpen: boolean;
  onClose: () => void;
  allTasks: TaskData[];
}

export function TaskDependenciesModal({
  task,
  isOpen,
  onClose,
  allTasks,
}: TaskDependenciesModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [dependents, setDependents] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, task.id]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const data = await getTaskDependencies(task.id);
      setDependencies(data.dependencies);
      setDependents(data.dependents);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load task dependencies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = allTasks.filter(
    (t) =>
      t.id !== task.id &&
      !dependencies.some((d) => d.prerequisiteTaskId === t.id) &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDependency = async (prerequisiteTaskId: string) => {
    try {
      await addTaskDependency(task.id, prerequisiteTaskId);
      await loadDependencies();
      toast({
        title: "Success",
        description: "Task dependency added",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleRemoveDependency = async (prerequisiteTaskId: string) => {
    try {
      await removeTaskDependency(task.id, prerequisiteTaskId);
      await loadDependencies();
      toast({
        title: "Success",
        description: "Task dependency removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove task dependency",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Task Dependencies</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dependencies Section */}
          <div>
            <Label>This task depends on:</Label>
            <ScrollArea className="h-32 border rounded-md p-2">
              {dependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  No dependencies added
                </p>
              ) : (
                <div className="space-y-2">
                  {dependencies.map((dep) => {
                    const prerequisiteTask = allTasks.find(
                      (t) => t.id === dep.prerequisiteTaskId
                    );
                    return (
                      <div
                        key={dep.prerequisiteTaskId}
                        className="flex items-center justify-between p-2 bg-secondary rounded-md"
                      >
                        <span className="text-sm">
                          {prerequisiteTask?.title || "Unknown Task"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleRemoveDependency(dep.prerequisiteTaskId)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Dependents Section */}
          <div>
            <Label>Tasks that depend on this:</Label>
            <ScrollArea className="h-32 border rounded-md p-2">
              {dependents.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">
                  No tasks depend on this
                </p>
              ) : (
                <div className="space-y-2">
                  {dependents.map((dep) => {
                    const dependentTask = allTasks.find(
                      (t) => t.id === dep.dependentTaskId
                    );
                    return (
                      <div
                        key={dep.dependentTaskId}
                        className="flex items-center justify-between p-2 bg-secondary rounded-md"
                      >
                        <span className="text-sm">
                          {dependentTask?.title || "Unknown Task"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Add Dependencies Section */}
          <div>
            <Label>Add dependency:</Label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <ScrollArea className="h-48 border rounded-md">
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">
                  No tasks found
                </p>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 hover:bg-secondary rounded-md cursor-pointer"
                      onClick={() => handleAddDependency(t.id)}
                    >
                      <span className="text-sm">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 