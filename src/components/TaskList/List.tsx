"use client";

import { ListData } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Edit2, MoreHorizontal, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ListProps {
  list: ListData;
  isActive?: boolean;
  onSelect: (listId: string) => void;
  onRename: (listId: string) => void;
  onDelete: (listId: string) => void;
}

export function List({ list, isActive, onSelect, onRename, onDelete }: ListProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent/50",
        isActive && "bg-accent"
      )}
    >
      <button
        className="flex-1 text-left"
        onClick={() => onSelect(list.id)}
      >
        {list.name}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(list.id)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => onDelete(list.id)}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 