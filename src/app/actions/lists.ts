"use server";

import { db } from "@/db";
import { lists, tasks } from "@/db/schema";
import { getCurrentUser } from "@/app/api/_lib/session";
import { nanoid } from "nanoid";
import { eq, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ListData } from "@/types/task";
import type { InferModel } from "drizzle-orm";

type NewList = InferModel<typeof lists, "insert">;

export async function createList(name: string): Promise<ListData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const now = new Date();
  const list = await db
    .insert(lists)
    .values({
      id: nanoid(),
      userId: user.id,
      name,
      isDefault: false,
      isStarred: false,
      isDone: false,
      isEditable: true,
      isDeletable: true,
      sortOrder: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  revalidatePath("/dashboard");
  return {
    id: list.id,
    name: list.name,
    userId: String(list.userId),
    sortOrder: list.sortOrder,
    isDefault: list.isDefault,
    isStarred: list.isStarred,
    isDone: list.isDone,
    isEditable: list.isEditable,
    isDeletable: list.isDeletable,
    isDeleted: list.isDeleted,
    createdAt: list.createdAt?.toISOString() ?? now.toISOString(),
    updatedAt: list.updatedAt?.toISOString() ?? now.toISOString(),
  };
}

export async function getLists(): Promise<ListData[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const listsData = await db
    .select()
    .from(lists)
    .where(and(
      eq(lists.userId, user.id),
      eq(lists.isDeleted, false)
    ))
    .orderBy(asc(lists.sortOrder));

  return listsData.map((list): ListData => ({
    id: list.id,
    name: list.name,
    userId: String(list.userId),
    sortOrder: list.sortOrder,
    isDefault: list.isDefault,
    isStarred: list.isStarred,
    isDone: list.isDone,
    isEditable: list.isEditable,
    isDeletable: list.isDeletable,
    isDeleted: list.isDeleted,
    createdAt: list.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: list.updatedAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export async function createSystemLists(userId: string) {
  const systemLists: NewList[] = [
    {
      id: nanoid(),
      userId,
      name: "Default List",
      isDefault: true,
      isStarred: false,
      isDone: false,
      isEditable: true,
      isDeletable: false,
      sortOrder: 0,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: nanoid(),
      userId,
      name: "Starred Tasks",
      isDefault: false,
      isStarred: true,
      isDone: false,
      isEditable: false,
      isDeletable: false,
      sortOrder: 1,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: nanoid(),
      userId,
      name: "Completed Tasks",
      isDefault: false,
      isStarred: false,
      isDone: true,
      isEditable: false,
      isDeletable: false,
      sortOrder: 2,
      isDeleted: false,
      deletedAt: null,
    },
  ];

  await db.insert(lists).values(systemLists);
  return systemLists;
}

export async function moveCompletedTaskToDoneList(taskId: string, userId: string) {
  const doneList = await db.query.lists.findFirst({
    where: (lists, { and, eq }) => 
      and(eq(lists.userId, userId), eq(lists.isDone, true))
  });

  if (!doneList) {
    throw new Error("Done list not found");
  }

  await db
    .update(tasks)
    .set({ 
      listId: doneList.id,
      completed: true,
      updatedAt: new Date()
    })
    .where(eq(tasks.id, taskId));
}

export async function getDefaultList(userId: string) {
  return await db.query.lists.findFirst({
    where: (lists, { and, eq }) => 
      and(eq(lists.userId, userId), eq(lists.isDefault, true))
  });
}

export async function getStarredList(userId: string) {
  return await db.query.lists.findFirst({
    where: (lists, { and, eq }) => 
      and(eq(lists.userId, userId), eq(lists.isStarred, true))
  });
}

export async function getDoneList(userId: string) {
  return await db.query.lists.findFirst({
    where: (lists, { and, eq }) => 
      and(eq(lists.userId, userId), eq(lists.isDone, true))
  });
}

export async function updateListOrder(listIds: string[]) {
  const updates = listIds.map((id, index) => {
    return db
      .update(lists)
      .set({ sortOrder: index })
      .where(eq(lists.id, id));
  });

  await Promise.all(updates);
}

export async function updateListName(listId: string, name: string, userId: string) {
  const list = await db.query.lists.findFirst({
    where: (lists, { and, eq }) => 
      and(eq(lists.id, listId), eq(lists.userId, userId))
  });

  if (!list) {
    throw new Error("List not found");
  }

  if (!list.isEditable) {
    throw new Error("List name cannot be edited");
  }

  await db
    .update(lists)
    .set({ 
      name,
      updatedAt: new Date()
    })
    .where(eq(lists.id, listId));
}

export async function deleteList(listId: string, userId?: string) {
  const user = userId ? { id: userId } : await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const list = await db.query.lists.findFirst({
    where: (lists, { and, eq }) => 
      and(eq(lists.id, listId), eq(lists.userId, user.id))
  });

  if (!list) {
    throw new Error("List not found");
  }

  if (!list.isDeletable) {
    throw new Error("List cannot be deleted");
  }

  await db
    .update(lists)
    .set({ 
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(lists.id, listId));

  revalidatePath("/dashboard");
} 