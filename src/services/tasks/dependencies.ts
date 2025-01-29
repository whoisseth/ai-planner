// src/services/tasks/dependencies.ts

import { TaskDependency } from "@/db/schema";

export async function addTaskDependency(
  dependentTaskId: string,
  prerequisiteTaskId: string
): Promise<TaskDependency> {
  const response = await fetch("/api/tasks/dependencies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dependentTaskId,
      prerequisiteTaskId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function removeTaskDependency(
  dependentTaskId: string,
  prerequisiteTaskId: string
): Promise<void> {
  const response = await fetch(
    `/api/tasks/dependencies?dependentTaskId=${dependentTaskId}&prerequisiteTaskId=${prerequisiteTaskId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

export async function getTaskDependencies(taskId: string): Promise<string[]> {
  const response = await fetch(`/api/tasks/${taskId}/dependencies`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function updateTaskDependencies(
  taskId: string,
  dependencyIds: string[]
): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dependencyIds }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

export async function checkDependencyCycle(
  taskId: string,
  dependencyId: string
): Promise<boolean> {
  const response = await fetch(
    `/api/tasks/${taskId}/dependencies/check-cycle?dependencyId=${dependencyId}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const { hasCycle } = await response.json();
  return hasCycle;
} 