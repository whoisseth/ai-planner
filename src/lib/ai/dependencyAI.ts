/**
 * @file dependencyAI.ts
 * @description AI-powered task dependency suggestion system
 * 
 * This module provides intelligent dependency suggestions based on:
 * - Pattern recognition in existing task relationships
 * - Time-based analysis of task completion order
 * - Content similarity between tasks
 * - User workflow patterns
 */

import { CohereClient } from 'cohere-ai';
import type { Task } from './types';

// Define the TaskRelationshipPattern type
export interface TaskRelationshipPattern {
  commonSequences: string[];
  timeBasedPatterns: {
    averageGap: number;
    typicalOrder: string[];
  };
  contentRelationships: {
    sharedTags: string[];
    similarityScore: number;
  };
}

// Initialize Cohere client for semantic analysis
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ''
});

/**
 * Calculate semantic similarity between tasks
 * @param task1 First task to compare
 * @param task2 Second task to compare
 * @returns Similarity score between 0 and 1
 */
async function calculateTaskSimilarity(task1: Task, task2: Task): Promise<number> {
  try {
    const text1 = `${task1.title} ${task1.description || ''}`;
    const text2 = `${task2.title} ${task2.description || ''}`;

    const response = await cohere.embed({
      texts: [text1, text2],
      model: 'embed-english-v3.0'
    });

    const embeddings = response.embeddings;
    if (!embeddings || !Array.isArray(embeddings) || embeddings.length !== 2) return 0;

    // Ensure embeddings are arrays of numbers
    const embedding1 = embeddings[0];
    const embedding2 = embeddings[1];
    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) return 0;

    // Calculate cosine similarity between embeddings
    const dotProduct = embedding1.reduce((sum: number, val: number, i: number) => 
      sum + (val * (embedding2[i] || 0)), 0);
    
    const norm1 = Math.sqrt(embedding1.reduce((sum: number, val: number) => sum + (val * val), 0));
    const norm2 = Math.sqrt(embedding2.reduce((sum: number, val: number) => sum + (val * val), 0));

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  } catch (error) {
    console.error('Error calculating task similarity:', error);
    return 0;
  }
}

/**
 * Analyze time-based patterns between tasks
 * @param task Current task
 * @param otherTask Task to compare with
 * @returns Score based on temporal relationship
 */
function analyzeTimePatterns(task: Task, otherTask: Task): number {
  // Since we don't have dueDate in the Task type, we'll use completedAt as a reference
  // or return 0 if we can't determine the temporal relationship
  const taskDate = task.completedAt;
  const otherDate = otherTask.completedAt;
  
  if (!taskDate || !otherDate) return 0;

  // Calculate days between completion dates
  const daysDiff = Math.abs(new Date(taskDate).getTime() - new Date(otherDate).getTime()) / (1000 * 60 * 60 * 24);
  
  // Score based on proximity (closer dates get higher scores)
  return Math.exp(-daysDiff / 7); // Exponential decay over a week
}

/**
 * Calculate tag overlap between tasks
 * @param task1 First task
 * @param task2 Second task
 * @returns Score based on shared tags
 */
function calculateTagOverlap(task1: Task, task2: Task): number {
  if (!task1.tags?.length || !task2.tags?.length) return 0;
  
  const tags1 = new Set(task1.tags);
  const tags2 = new Set(task2.tags);
  
  if (tags1.size === 0 || tags2.size === 0) return 0;
  
  const intersection = new Set([...tags1].filter(tag => tags2.has(tag)));
  const union = new Set([...tags1, ...tags2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate dependency relevance score
 * @param task Current task
 * @param potentialDependency Potential dependency task
 * @returns Score indicating likelihood of dependency
 */
async function calculateDependencyScore(
  task: Task,
  potentialDependency: Task
): Promise<number> {
  // Content similarity
  const similarityScore = await calculateTaskSimilarity(task, potentialDependency);
  
  // Time-based patterns
  const timeScore = analyzeTimePatterns(task, potentialDependency);
  
  // Tag overlap
  const tagScore = calculateTagOverlap(task, potentialDependency);
  
  // Priority relationship
  const priorityScore = task.settings?.priority === 'High' && 
    potentialDependency.settings?.priority === 'Urgent' ? 0.5 : 0;

  // Combine scores with weights
  return (
    0.4 * similarityScore +
    0.3 * timeScore +
    0.2 * tagScore +
    0.1 * priorityScore
  );
}

/**
 * Suggest task dependencies
 * @param task Task to find dependencies for
 * @param otherTasks Pool of potential dependency tasks
 * @param userId User's ID
 * @returns Array of suggested dependencies with scores
 */
export async function suggestDependencies(
  task: Task,
  otherTasks: Task[],
  userId: string
): Promise<Array<{ task: Task; score: number }>> {
  // Filter out completed tasks and the task itself
  const potentialDependencies = otherTasks.filter(t => 
    !t.completed && t.id !== task.id
  );

  // Calculate scores for all potential dependencies
  const scoredDependencies = await Promise.all(
    potentialDependencies.map(async dependency => ({
      task: dependency,
      score: await calculateDependencyScore(task, dependency)
    }))
  );

  // Sort by score and return top suggestions
  return scoredDependencies
    .sort((a, b) => b.score - a.score)
    .filter(({ score }) => score > 0.4); // Only return strong dependency candidates
}

/**
 * Detects potential circular dependencies
 */
export function detectCircularDependencies(
  taskId: string,
  dependencies: Map<string, string[]>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];
  
  function dfs(currentId: string) {
    if (path.includes(currentId)) {
      const cycleStart = path.indexOf(currentId);
      cycles.push(path.slice(cycleStart));
      return;
    }
    
    if (visited.has(currentId)) return;
    
    visited.add(currentId);
    path.push(currentId);
    
    const deps = dependencies.get(currentId) || [];
    for (const depId of deps) {
      dfs(depId);
    }
    
    path.pop();
  }
  
  dfs(taskId);
  return cycles;
}

/**
 * Suggests optimal task ordering based on dependencies
 */
export function suggestTaskOrder(
  tasks: Task[],
  dependencies: Map<string, string[]>
): Task[] {
  const visited = new Set<string>();
  const order: Task[] = [];
  
  function visit(taskId: string) {
    if (visited.has(taskId)) return;
    
    visited.add(taskId);
    const deps = dependencies.get(taskId) || [];
    
    for (const depId of deps) {
      visit(depId);
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (task) order.push(task);
  }
  
  for (const task of tasks) {
    if (task.id) {
      visit(task.id);
    }
  }
  
  return order;
}

/**
 * Analyzes task completion chain patterns
 */
export async function analyzeCompletionChains(
  userId: string,
  timeframe: number = 30 // days
): Promise<TaskRelationshipPattern> {
  // TODO: Implement completion chain analysis
  return {
    commonSequences: [],
    timeBasedPatterns: {
      averageGap: 0,
      typicalOrder: []
    },
    contentRelationships: {
      sharedTags: [],
      similarityScore: 0
    }
  };
} 