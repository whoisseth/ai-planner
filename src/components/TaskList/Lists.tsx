"use client";

import { useState } from "react";
import { List } from "./List";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ListData } from "@/types/task";

interface ListsProps {
  lists: ListData[];
  activeListId?: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string) => Promise<void>;
  onRenameList: (listId: string, name: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
}

export function Lists({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onRenameList,
  onDeleteList,
}: ListsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>();
  const [newListName, setNewListName] = useState("");

  const handleCreateList = async () => {
    if (newListName.trim()) {
      await onCreateList(newListName.trim());
      setNewListName("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleRenameList = async () => {
    if (selectedListId && newListName.trim()) {
      await onRenameList(selectedListId, newListName.trim());
      setNewListName("");
      setIsRenameDialogOpen(false);
    }
  };

  const openRenameDialog = (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (list) {
      setSelectedListId(listId);
      setNewListName(list.name);
      setIsRenameDialogOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lists</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {lists.map((list) => (
          <List
            key={list.id}
            list={list}
            isActive={list.id === activeListId}
            onSelect={onSelectList}
            onRename={openRenameDialog}
            onDelete={onDeleteList}
          />
        ))}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename List</DialogTitle>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameList}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 