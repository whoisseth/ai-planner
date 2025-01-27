"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  ListTodo,
  Star,
  Calendar,
  Settings,
  PlusCircle,
  List,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  PanelLeftClose,
  PanelLeft,
  Brain,
} from "lucide-react";
import { createList } from "@/app/actions/lists";

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

const MIN_WIDTH = 64;
const MAX_WIDTH = 240;

interface CollapsibleSidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function CollapsibleSidebar({ onCollapsedChange }: CollapsibleSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(MAX_WIDTH);
  const [isHovering, setIsHovering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startDragXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const toggleSidebar = () => {
    const newCollapsed = !isCollapsed;
    if (newCollapsed) {
      setWidth(MIN_WIDTH);
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
      setWidth(MAX_WIDTH);
    }
    onCollapsedChange?.(newCollapsed);
  };

  const handleCreateList = async () => {
    if (newListName.trim()) {
      await createList(newListName.trim());
      setNewListName("");
      setIsOpen(false);
    }
  };

  // Handle drag to resize
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      e.preventDefault();
      startDragXRef.current = e.clientX;
      startWidthRef.current = sidebarRef.current.offsetWidth;
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const deltaX = e.clientX - startDragXRef.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + deltaX));
      setWidth(newWidth);

      // Update collapsed state based on drag direction and width
      if (startWidthRef.current === MAX_WIDTH) {
        // When starting from fully open
        setIsCollapsed(deltaX < -50); // Collapse if dragged left more than 50px
      } else if (startWidthRef.current === MIN_WIDTH) {
        // When starting from collapsed
        setIsCollapsed(deltaX < 50); // Stay collapsed unless dragged right more than 50px
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
      document.body.style.cursor = '';
      
      // Snap to either fully open or closed based on current width
      const shouldCollapse = width < (MAX_WIDTH / 2);
      setWidth(shouldCollapse ? MIN_WIDTH : MAX_WIDTH);
      setIsCollapsed(shouldCollapse);
      onCollapsedChange?.(shouldCollapse);
    };

    const dragHandle = sidebarRef.current?.querySelector('.drag-handle') as HTMLElement;
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', handleMouseDown);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (dragHandle) {
        dragHandle.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, width, onCollapsedChange]);

  return (
    <TooltipProvider delayDuration={0}>
      <>
        {/* Desktop Sidebar */}
        <div 
          ref={sidebarRef}
          className={cn(
            "hidden h-screen border-r bg-card lg:flex fixed top-0 left-0 z-40",
            "transition-all duration-300 ease-in-out",
            isDragging && "select-none"
          )}
          style={{ 
            width: `${width}px`,
            transition: isDragging ? 'none' : 'width 300ms ease-in-out'
          }}
        >
          {/* Content Container */}
          <div className="flex flex-col h-full w-full relative">
            {/* Header */}
            <div className="flex h-14 items-center border-b px-4">
              <Link 
                className={cn(
                  "flex items-center gap-2 font-semibold",
                  isCollapsed && "justify-center"
                )}
                href="/"
              >
                <Brain className="h-6 w-6 flex-shrink-0 text-primary" />
                <span className={cn(
                  "transition-all duration-300",
                  isCollapsed && "hidden"
                )}>AI Planner</span>
              </Link>
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={toggleSidebar}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
              {sidebarItems.map((item) => (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        isCollapsed && "justify-center px-2"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className={cn(
                        "transition-all duration-300",
                        isCollapsed && "hidden"
                      )}>{item.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={20}>
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>

            {/* Quick Actions */}
            <div className="border-t p-3">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button 
                        className={cn(
                          "w-full transition-all duration-300 ",
                          isCollapsed ? "px-2 justify-center" : "justify-start"
                        )}
                        size={isCollapsed ? "icon" : "default"}
                        variant="outline"
                      >
                        <PlusCircle className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                        {!isCollapsed && <span>New List</span>}
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={20}>
                    Create new list
                  </TooltipContent>
                </Tooltip>
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

            {/* Drag Handle with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="drag-handle absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/50 z-50 transition-colors"
                >
                  <div className="absolute inset-y-0 right-0.5 w-0.5 bg-border opacity-50 hover:opacity-100 transition-opacity" />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                align="center" 
                className="flex flex-col gap-1"
              >
                <p>Drag to resize sidebar</p>
                <p className="text-xs text-muted-foreground">
                  {isCollapsed ? "→ Drag right to expand" : "← Drag left to collapse"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Collapse/Expand Button - Fixed Position */}
            {isCollapsed && (
              <Button
                variant="outline"
                size="icon"
                className="fixed bottom-20 left-4 z-50 shadow-md hover:shadow-lg"
                onClick={toggleSidebar}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
          <nav className="flex justify-around p-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center p-2 text-xs",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="mt-1">{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>
      </>
    </TooltipProvider>
  );
} 