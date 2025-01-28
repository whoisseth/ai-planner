import { db } from "@/db";
import { tags, tasks, taskTags } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { analyzeText } from "@/lib/nlp";

interface TagSuggestion {
  tagId: string;
  name: string;
  score: number;
  reason: "content" | "cooccurrence" | "recent" | "timePattern";
}

export async function suggestTags(
  userId: string,
  taskTitle: string,
  taskDescription?: string,
  listId?: string
): Promise<TagSuggestion[]> {
  const suggestions: TagSuggestion[] = [];

  // 1. Content-Based Analysis
  const keywords = await analyzeText(`${taskTitle} ${taskDescription || ""}`);
  const contentBasedTags = await db
    .select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(and(
      eq(tags.userId, userId),
      sql`${tags.name} LIKE ANY (${keywords.map(k => `%${k}%`)})`
    ));

  suggestions.push(
    ...contentBasedTags.map(tag => ({
      tagId: tag.id,
      name: tag.name,
      score: 1,
      reason: "content" as const,
    }))
  );

  // 2. Co-occurrence Analysis
  const coOccurringTags = await db
    .select({
      tagId: tags.id,
      name: tags.name,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(taskTags)
    .innerJoin(tasks, eq(tasks.id, taskTags.taskId))
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(and(
      eq(tasks.userId, userId),
      listId ? eq(tasks.listId, listId) : undefined,
    ))
    .groupBy(tags.id, tags.name)
    .orderBy(desc(sql`count`))
    .limit(5);

  suggestions.push(
    ...coOccurringTags.map(tag => ({
      tagId: tag.tagId,
      name: tag.name,
      score: tag.count / (Math.max(...coOccurringTags.map(t => t.count)) || 1),
      reason: "cooccurrence" as const,
    }))
  );

  // 3. Recent Usage
  const recentTags = await db
    .select({
      id: tags.id,
      name: tags.name,
      lastUsed: tags.lastUsed,
    })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(desc(tags.lastUsed))
    .limit(3);

  suggestions.push(
    ...recentTags.map((tag, index) => ({
      tagId: tag.id,
      name: tag.name,
      score: (3 - index) / 3,
      reason: "recent" as const,
    }))
  );

  // 4. Time-Based Patterns
  const currentHour = new Date().getHours();
  const timeBasedTags = await db
    .select({
      tagId: tags.id,
      name: tags.name,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(taskTags)
    .innerJoin(tasks, eq(tasks.id, taskTags.taskId))
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(and(
      eq(tasks.userId, userId),
      sql`strftime('%H', datetime(${tasks.createdAt}, 'unixepoch')) = ${currentHour.toString().padStart(2, '0')}`
    ))
    .groupBy(tags.id, tags.name)
    .orderBy(desc(sql`count`))
    .limit(3);

  suggestions.push(
    ...timeBasedTags.map(tag => ({
      tagId: tag.tagId,
      name: tag.name,
      score: 0.5,
      reason: "timePattern" as const,
    }))
  );

  // Combine and deduplicate suggestions
  const uniqueSuggestions = suggestions.reduce((acc, curr) => {
    const existing = acc.find(s => s.tagId === curr.tagId);
    if (existing) {
      existing.score = Math.max(existing.score, curr.score);
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as TagSuggestion[]);

  return uniqueSuggestions.sort((a, b) => b.score - a.score);
} 