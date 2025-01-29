// src/app/dashboard/page.tsx

import React from "react";
import { getTasks } from "../actions/tasks";
import { getLists } from "../actions/lists";
import { TaskList } from "./components/TaskList";
import { Suspense } from "react";
import { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";

// Loading component for TaskList
function TaskListLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <Skeleton className="bg- h-8 w-1/4 rounded" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="bg- h-16 rounded" />
        ))}
      </div>
    </div>
  );
}

// Error component for TaskList
function TaskListError({ error }: { error: Error }) {
  return (
    <div className="rounded-lg bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Error loading tasks
          </h3>
          <div className="mt-2 text-sm text-red-700">{error.message}</div>
        </div>
      </div>
    </div>
  );
}

// Metadata for the dashboard page
export const metadata: Metadata = {
  title: "Dashboard | AI Task Planner",
  description:
    "View and manage your tasks efficiently with AI-powered task planning",
};

// Main dashboard component
export default async function DashboardPage() {
  try {
    // Fetch data server-side
    const [tasks, lists] = await Promise.all([getTasks(), getLists()]);
    console.log("tasks: ", tasks);

    return (
      <div className="space-y-6">
        <Suspense fallback={<TaskListLoading />}>
          <div className="grid gap-6">
            {/* Stats Grid */}
            <div className="grid hidden grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg p-6 shadow">
                <h3 className="text-lg font-medium">Total Tasks</h3>
                <p className="mt-2 text-3xl font-bold">{tasks.length}</p>
              </div>
              <div className="rounded-lg p-6 shadow">
                <h3 className="text-lg font-medium">Completed Tasks</h3>
                <p className="mt-2 text-3xl font-bold">
                  {tasks.filter((t) => t.completed).length}
                </p>
              </div>
              <div className="rounded-lg p-6 shadow">
                <h3 className="text-lg font-medium">Lists</h3>
                <p className="mt-2 text-3xl font-bold">{lists.length}</p>
              </div>
            </div>

            {/* Task List */}
            <TaskList tasks={tasks} lists={lists} showHeader={true} />
          </div>
        </Suspense>
      </div>
    );
  } catch (error) {
    // Log the error for debugging
    console.error("Error in DashboardPage:", error);

    // Show a user-friendly error message
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading dashboard
            </h3>
            <div className="mt-2 text-sm text-red-700">
              Unable to load your tasks and lists. Please try refreshing the
              page.
            </div>
          </div>
        </div>
      </div>
    );
  }
}
