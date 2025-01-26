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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock as TimeIcon, X } from "lucide-react";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (taskData: {
    title: string;
    description?: string;
    listId: string;
    isAllDay?: boolean;
    date?: string;
    time?: string;
    priority?: "Low" | "Medium" | "High" | "Urgent";
  }) => void;
  onCreateList?: (name: string) => Promise<{ id: string; name: string }>;
  lists: { id: string; name: string }[];
}

export function TaskDialog({ open, onOpenChange, onCreateTask, onCreateList, lists }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState(lists[0]?.id || "");
  const [isAllDay, setIsAllDay] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTask({
      title,
      description,
      listId,
      isAllDay,
      date,
      time: isAllDay ? undefined : time,
      priority,
    });
    resetForm();
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || !onCreateList) return;
    try {
      const newList = await onCreateList(newListName.trim());
      setListId(newList.id);
      setNewListName("");
      setIsCreatingList(false);
      toast.success("List created successfully");
    } catch (error) {
      toast.error("Failed to create list");
      console.error("Error creating list:", error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setListId(lists[0]?.id || "");
    setIsAllDay(false);
    setDate("");
    setTime("");
    setPriority("Medium");
    setNewListName("");
    setIsCreatingList(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
        <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-xl font-semibold">New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="space-y-6 p-4">
            <div className="space-y-4">
              <Input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Textarea
                placeholder="Add description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>

            <div className="space-y-4">
              <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
                <SelectTrigger className="w-full ">
                  <SelectValue placeholder="Set priority" />
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
                    className=""
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                    className="px-6"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingList(false);
                      setNewListName("");
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={listId} onValueChange={setListId}>
                    <SelectTrigger className="w-full ">
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
                  {onCreateList && (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={() => setIsCreatingList(true)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    {/* <Calendar className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" /> */}
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="pl-10 "
                    />
                  </div>
                </div>
                {!isAllDay && (
                  <div className="flex-1">
                    <div className="relative">
                      {/* <TimeIcon className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" /> */}
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="pl-10 "
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={isAllDay}
                  onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
                  className="rounded"
                />
                <Label htmlFor="allDay" className="text-sm text-muted-foreground">
                  All day
                </Label>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="p-4 border-t mt-auto">
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 "
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              className="flex-1"
            >
              Create Task
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}   