import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Priority } from "./TaskItem";
import { toast } from "sonner";
import { TaskData } from "@/types/task";

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData;
  lists: { id: string; name: string }[];
  onUpdate: (taskData: {
    title: string;
    description?: string;
    listId: string;
    isAllDay?: boolean;
    date?: string;
    time?: string;
    priority?: Priority;
  }) => void;
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
}

export function TaskEditDialog({
  open,
  onOpenChange,
  task,
  lists,
  onUpdate,
  onCreateList,
}: TaskEditDialogProps) {
  const [editedTask, setEditedTask] = useState({
    title: task.title,
    description: task.description || "",
    listId: task.listId,
    priority: task.priority as Priority,
    date: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    time: task.dueTime || "",
    isAllDay: !task.dueTime
  });

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleCreateList = async () => {
    if (!newListName.trim() || !onCreateList) return;
    
    try {
      const newList = await onCreateList(newListName);
      setEditedTask({ ...editedTask, listId: newList.id });
      setIsCreatingList(false);
      setNewListName("");
      toast.success("List created successfully");
    } catch (error) {
      toast.error("Failed to create list");
    }
  };

  const handleSave = () => {
    if (editedTask.title.trim()) {
      onUpdate({
        title: editedTask.title.trim(),
        description: editedTask.description.trim() || undefined,
        listId: editedTask.listId,
        priority: editedTask.priority,
        date: editedTask.date || undefined,
        time: editedTask.isAllDay ? undefined : (editedTask.time || undefined),
        isAllDay: editedTask.isAllDay
      });
      
      toast.success("Task updated successfully");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
        <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-xl font-semibold">Edit Task</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <div className="space-y-4 p-4">
            <Input
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              placeholder="Task title"
              className="w-full"
            />
            
            <Textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              placeholder="Add description"
              className="w-full min-h-[100px] resize-none"
            />

            <Select
              value={editedTask.priority}
              onValueChange={(value: Priority) => setEditedTask({ ...editedTask, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Medium Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low Priority</SelectItem>
                <SelectItem value="Medium">Medium Priority</SelectItem>
                <SelectItem value="High">High Priority</SelectItem>
                <SelectItem value="Urgent">Urgent Priority</SelectItem>
              </SelectContent>
            </Select>

            {isCreatingList ? (
              <div className="flex gap-2">
                <Input
                  placeholder="New list name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreatingList(false);
                    setNewListName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={editedTask.listId}
                  onValueChange={(value) => setEditedTask({ ...editedTask, listId: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose list" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setIsCreatingList(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-4">
              <Input
                type="date"
                value={editedTask.date}
                onChange={(e) => setEditedTask({ ...editedTask, date: e.target.value })}
                placeholder="mm/dd/yyyy"
                className="flex-1"
              />
              {!editedTask.isAllDay && (
                <Input
                  type="time"
                  value={editedTask.time}
                  onChange={(e) => setEditedTask({ ...editedTask, time: e.target.value })}
                  placeholder="--:-- --"
                  className="flex-1"
                />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={editedTask.isAllDay}
                onCheckedChange={(checked) => 
                  setEditedTask({ ...editedTask, isAllDay: checked as boolean })
                }
              />
              <Label htmlFor="allDay">All day</Label>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto">
          <div className="flex gap-2 w-full">
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 