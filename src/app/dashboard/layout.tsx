"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  Star,
  Calendar,
  Settings,
  PlusCircle,
  List,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { createList } from "../actions/lists";
import { AIChatbox } from "@/components/AIChatbox";
import { Label } from "@/components/ui/label";


const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tasks",
    href: "/dashboard/tasks",
    icon: ListTodo,
  },
  {
    title: "Lists",
    href: "/dashboard/lists",
    icon: List,
  },
  {
    title: "Starred",
    href: "/dashboard/starred",
    icon: Star,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleCreateList = async () => {
    if (newListName.trim()) {
      await createList(newListName.trim());
      setNewListName("");
      setIsOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <span className="text-lg font-semibold">AI Planner</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="border-t p-4 space-y-4">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New List
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 bg-background sm:max-w-[500px] rounded-lg border shadow-lg">
                <DialogHeader className="p-4 flex flex-row items-center justify-between border-b">
                  <DialogTitle className="text-xl font-semibold">Create new list</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto">
                  <div className="space-y-6 p-4">
                    <div className="grid gap-2">
                      <Input
                        id="listName"
                        placeholder="List name"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-4 border-t mt-auto">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 h-12"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateList}
                      disabled={!newListName.trim()}
                      className="flex-1 h-12"
                    >
                      Create
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">{children}</main>
        <AIChatbox />
      </div>
    </div>
  );
}
