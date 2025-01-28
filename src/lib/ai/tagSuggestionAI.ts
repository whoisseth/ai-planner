/**
 * @file tagSuggestionAI.ts
 * @description AI-powered tag suggestion system
 * 
 * This module provides intelligent tag suggestions based on:
 * - Content analysis of task title and description
 * - Historical tag usage patterns
 * - Semantic similarity between tasks
 * - Time-based patterns
 */

import { CohereClient } from 'cohere-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { db } from '@/db';
import { tags, tasks, taskTags, type Task, type Tag } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { analyzeText } from '@/lib/nlp';

// Initialize clients
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ''
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

interface AITagSuggestion {
  tagId: string;
  name: string;
  score: number;
  reason: 'semantic' | 'content' | 'cooccurrence' | 'recent' | 'timePattern';
  confidence: number;
}

interface TaskMetadata {
  userId: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
}

/**
 * Calculate semantic similarity between two pieces of text
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @returns Similarity score between 0 and 1
 */
async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  try {
    const response = await cohere.embed({
      texts: [text1, text2],
      model: 'embed-english-v3.0'
    });

    const embeddings = response.embeddings;
    if (!Array.isArray(embeddings) || embeddings.length !== 2) return 0;

    // Ensure embeddings are arrays of numbers
    const embedding1 = embeddings[0];
    const embedding2 = embeddings[1];
    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) return 0;

    // Calculate cosine similarity between embeddings
    const dotProduct = embedding1.reduce((sum: number, val: number, i: number) => 
      sum + val * (embedding2[i] || 0), 0);
    const norm1 = Math.sqrt(embedding1.reduce((sum: number, val: number) => sum + val * val, 0));
    const norm2 = Math.sqrt(embedding2.reduce((sum: number, val: number) => sum + val * val, 0));

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

/**
 * Extract keywords from task content
 * @param task Task to analyze
 * @returns Array of extracted keywords
 */
function extractKeywords(task: Task): string[] {
  const content = `${task.title} ${task.description || ''}`.toLowerCase();
  
  // Remove common words and punctuation
  const words = content
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !commonWords.includes(word));

  return Array.from(new Set(words));
}

/**
 * Calculate tag relevance score based on multiple factors
 * @param tag Tag to evaluate
 * @param task Current task
 * @param existingTasks User's existing tasks
 * @returns Relevance score between 0 and 1
 */
async function calculateTagRelevance(
  tag: Tag,
  task: Task,
  existingTasks: Task[]
): Promise<number> {
  // Content similarity score
  const contentSimilarity = await calculateSimilarity(
    `${task.title} ${task.description || ''}`,
    tag.name
  );

  // Get tag counts for existing tasks
  const tagCounts = await db
    .select({
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(taskTags)
    .where(
      and(
        eq(taskTags.tagId, tag.id),
        sql`${taskTags.taskId} IN (${existingTasks.map(t => t.id)})`
      )
    );

  // Usage frequency score
  const maxTagCount = Math.max(1, tag.usageCount);
  const usageScore = (tagCounts[0]?.count || 0) / maxTagCount;

  // Recency score
  const daysSinceLastUse = tag.lastUsed 
    ? (Date.now() - new Date(tag.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
    : 30;
  const recencyScore = Math.exp(-daysSinceLastUse / 30); // Exponential decay

  // Combine scores with weights
  return (
    0.4 * contentSimilarity +
    0.3 * usageScore +
    0.3 * recencyScore
  );
}

/**
 * Get tag suggestions for a task
 * @param task Task to get suggestions for
 * @param existingTags User's existing tags
 * @param userId User's ID
 * @returns Array of suggested tags with scores
 */
export async function suggestTags(
  task: Task,
  existingTags: Tag[],
  userId: string
): Promise<Array<{ tag: Tag; score: number }>> {
  // Calculate relevance scores for all existing tags
  const scoredTags = await Promise.all(
    existingTags.map(async tag => ({
      tag,
      score: await calculateTagRelevance(tag, task, [task])
    }))
  );

  // Sort by score and return top suggestions
  return scoredTags
    .sort((a, b) => b.score - a.score)
    .filter(({ score }) => score > 0.3); // Only return reasonably relevant tags
}

// Common English words to filter out
const commonWords = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
];

/**
 * Generate embeddings for task content
 */
async function generateTaskEmbedding(content: string): Promise<number[]> {
  const response = await cohere.embed({
    texts: [content],
    model: 'embed-english-v3.0'
  });

  const embeddings = response.embeddings;
  if (!embeddings || !Array.isArray(embeddings)) {
    throw new Error('Failed to generate embeddings');
  }

  const firstEmbedding = embeddings[0];
  if (!Array.isArray(firstEmbedding)) {
    throw new Error('Invalid embedding format');
  }

  return firstEmbedding;
}

/**
 * Find semantically similar tasks and their tags
 */
async function findSimilarTaskTags(
  taskContent: string,
  userId: string
): Promise<AITagSuggestion[]> {
  const embedding = await generateTaskEmbedding(taskContent);
  const index = pinecone.index('tasks');

  const queryResponse = await index.query({
    vector: embedding,
    topK: 5,
    filter: {
      userId: { $eq: userId }
    },
    includeMetadata: true
  });

  const suggestions: AITagSuggestion[] = [];
  const matches = queryResponse.matches || [];

  for (const match of matches) {
    const metadata = match.metadata as TaskMetadata | undefined;
    if (!metadata?.tags) continue;

    const score = match.score || 0;
    for (const tagName of metadata.tags) {
      suggestions.push({
        tagId: '', // Will be populated from DB
        name: tagName,
        score: score,
        reason: 'semantic',
        confidence: score
      });
    }
  }

  return suggestions;
}

/**
 * Enhanced tag suggestion system with AI capabilities
 */
export async function suggestTagsWithAI(
  userId: string,
  taskTitle: string,
  taskDescription?: string,
  listId?: string
): Promise<AITagSuggestion[]> {
  const taskContent = `${taskTitle} ${taskDescription || ''}`;
  
  // 1. Get semantic suggestions
  const semanticSuggestions = await findSimilarTaskTags(taskContent, userId);

  // 2. Get traditional suggestions
  const traditionalSuggestions = await suggestTraditionalTags(userId, taskTitle, taskDescription, listId);

  // 3. Combine and deduplicate suggestions
  const allSuggestions = [...semanticSuggestions, ...traditionalSuggestions];
  const uniqueSuggestions = new Map<string, AITagSuggestion>();

  for (const suggestion of allSuggestions) {
    const existing = uniqueSuggestions.get(suggestion.name);
    if (!existing || existing.score < suggestion.score) {
      uniqueSuggestions.set(suggestion.name, suggestion);
    }
  }

  // 4. Sort by score and confidence
  return Array.from(uniqueSuggestions.values())
    .sort((a, b) => (b.score * b.confidence) - (a.score * a.confidence));
}

/**
 * Traditional tag suggestion logic
 */
async function suggestTraditionalTags(
  userId: string,
  taskTitle: string,
  taskDescription?: string,
  listId?: string
): Promise<AITagSuggestion[]> {
  const suggestions: AITagSuggestion[] = [];

  // Content-based analysis
  const keywords = await analyzeText(`${taskTitle} ${taskDescription || ''}`);
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
      reason: 'content' as const,
      confidence: 0.8
    }))
  );

  // Co-occurrence analysis
  const coOccurringTags = await db
    .select({
      tagId: tags.id,
      name: tags.name,
      count: sql<number>`COUNT(*)`.as('count'),
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

  const maxCount = Math.max(...coOccurringTags.map(t => t.count));
  suggestions.push(
    ...coOccurringTags.map(tag => ({
      tagId: tag.tagId,
      name: tag.name,
      score: tag.count / (maxCount || 1),
      reason: 'cooccurrence' as const,
      confidence: 0.9
    }))
  );

  return suggestions;
}

/**
 * Store task embedding in Pinecone for future suggestions
 */
export async function storeTaskEmbedding(
  taskId: string,
  userId: string,
  title: string,
  description: string,
  tags: string[]
): Promise<void> {
  const content = `${title} ${description}`;
  const embedding = await generateTaskEmbedding(content);
  
  const index = pinecone.index('tasks');
  await index.upsert([{
    id: taskId,
    values: embedding,
    metadata: {
      userId,
      title,
      description,
      tags,
      createdAt: new Date().toISOString()
    }
  }]);
}

/**
 * Update tag usage statistics
 */
export async function updateTagStats(
  tagId: string,
  userId: string
): Promise<void> {
  await db
    .update(tags)
    .set({
      usageCount: sql`${tags.usageCount} + 1`,
      lastUsed: new Date()
    })
    .where(and(
      eq(tags.id, tagId),
      eq(tags.userId, userId)
    ));
} 