import { Tag } from "@/db/schema";

export interface CreateTagData {
  name: string;
  color: string;
}

export async function createTag(data: CreateTagData): Promise<Tag> {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function getTags(): Promise<Tag[]> {
  const response = await fetch("/api/tags");

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function updateTag(
  id: string,
  data: Partial<CreateTagData>
): Promise<Tag> {
  const response = await fetch(`/api/tags/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`/api/tags/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

export async function getTaskTags(taskId: string): Promise<Tag[]> {
  const response = await fetch(`/api/tasks/${taskId}/tags`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function updateTaskTags(
  taskId: string,
  tagIds: string[]
): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}/tags`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tagIds }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
} 