"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  BarChart2,
  Settings,
  Copy,
} from "lucide-react";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  {
    name: "Journal",
    href: "/dashboard/reflection",
    icon: CalendarDays,
  },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden h-full w-56 flex-col border-r bg-background lg:flex">
        <div className="flex h-full max-h-14 items-center border-b px-4">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <LayoutDashboard className="h-6 w-6" />
            <span>AI Planner</span>
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-2 p-2">
            {sidebarItems.map((item) => (
              <Button
                key={item.name}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={cn(
                  "justify-start",
                  pathname === item.href && "bg-muted",
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ))}
            <Button
              variant="ghost"
              className={cn(
                "justify-start",
                pathname === "/dashboard/templates" && "bg-muted",
              )}
              asChild
            >
              <Link
                href="/dashboard/templates"
                className={cn(
                  "w-full justify-start gap-2",
                  pathname === "/dashboard/templates" && "bg-muted",
                )}
              >
                <Copy className="h-4 w-4" />
                Templates
              </Link>
            </Button>
          </nav>
        </ScrollArea>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
        <nav className="flex justify-around p-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center p-2 text-xs",
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="mt-1">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
