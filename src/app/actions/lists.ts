"use server";

import { db } from "@/db";
import { lists } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { nanoid } from "nanoid";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ListData } from "@/types/task";

const user = { id: 1 }; // Temporary user

export async function createList(name: string): Promise<ListData> {
  const list = await db
    .insert(lists)
    .values({
      id: nanoid(),
      userId: user.id,
      name,
      isDefault: false,
      sortOrder: 0,
    })
    .returning()
    .get();

  revalidatePath("/dashboard");
  return {
    ...list,
    userId: String(list.userId)
  };
}

export async function renameList(listId: string, name: string): Promise<ListData> {
  const list = await db
    .update(lists)
    .set({ name })
    .where(eq(lists.id, listId))
    .returning()
    .get();

  revalidatePath("/dashboard");
  return {
    ...list,
    userId: String(list.userId)
  };
}

export async function deleteList(listId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await db.delete(lists).where(eq(lists.id, listId));

  revalidatePath("/dashboard");
}

export async function getLists(): Promise<ListData[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const listsData = await db
    .select()
    .from(lists)
    .where(eq(lists.userId, user.id))
    .orderBy(asc(lists.sortOrder));

  return listsData.map((list): ListData => ({
    ...list,
    userId: String(list.userId),
    createdAt: list.createdAt ? new Date(list.createdAt) : null,
    updatedAt: list.updatedAt ? new Date(list.updatedAt) : null,
  }));
} 