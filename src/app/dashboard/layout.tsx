"use client";

import { useState } from "react";
import { AIChatbox } from "@/components/AIChatbox";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <CollapsibleSidebar onCollapsedChange={setIsSidebarCollapsed} />
      
      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 overflow-auto transition-all duration-300 lg:pl-16",
          !isSidebarCollapsed && "lg:pl-[240px]"
        )}
      >
        <div className="">
          <main className="h-full">{children}</main>
        </div>
        <AIChatbox />
      </div>
    </div>
  );
}
