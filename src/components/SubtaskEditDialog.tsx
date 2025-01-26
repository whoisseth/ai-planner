"use client";

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
import { Label } from "@/components/ui/label";
import { SubTaskData } from "@/types/task";

interface SubtaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtask: SubTaskData;
  onUpdate: (data: { title: string; description: string | null }) => void;
}

export function SubtaskEditDialog({
  open,
  onOpenChange,
  subtask,
  onUpdate,
}: SubtaskEditDialogProps) {
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description || "");

  const handleSave = () => {
    onUpdate({
      title: title.trim(),
      description: description.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
        <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
          <DialogTitle className="text-xl font-semibold">Edit Subtask</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <div className="space-y-6 p-4">
            <div className="grid gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Subtask title"
                className=""
              />
            </div>
            <div className="grid gap-2">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description"
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 "
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 "
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 