import { Template } from "@/db/schema";

export interface TemplateSettings {
  title?: string;
  description?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  tags?: string[];
  reminder?: {
    time?: number;
    type?: "email" | "push" | "both";
    recurrence?: {
      frequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
      interval: number;
      daysOfWeek?: number[];
      endDate?: number;
      count?: number;
    };
  };
  estimatedDuration?: number;
  defaultSubtasks?: {
    title: string;
    description?: string;
  }[];
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  settings: TemplateSettings;
  isPublic?: boolean;
}

export async function createTemplate(data: CreateTemplateData): Promise<Template> {
  const response = await fetch("/api/templates", {
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

export async function updateTemplate(
  id: string,
  data: CreateTemplateData
): Promise<Template> {
  const response = await fetch(`/api/templates?id=${id}`, {
    method: "PUT",
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

export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/templates?id=${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

export async function getTemplates(includePublic = false): Promise<Template[]> {
  const response = await fetch(`/api/templates?includePublic=${includePublic}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export async function applyTemplate(
  templateId: string,
  listId: string
): Promise<void> {
  const response = await fetch(`/api/templates/${templateId}/apply?listId=${listId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
} 