/**
 * @file templateSuggestionAI.ts
 * @description AI-powered task template suggestion system
 * 
 * This module provides intelligent template suggestions based on:
 * - Usage frequency analysis and time patterns
 * - Context matching and list-based suggestions
 * - User behavior analysis and success rates
 * - Adaptive scoring based on user preferences
 */

import { CohereClient } from 'cohere-ai';
import type { Task, TemplateSettings } from './types';

// Initialize Cohere client for semantic analysis
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ''
});

interface Template {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  settings: TemplateSettings;
  usageCount: number;
  lastUsed: Date | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateUsagePattern {
  hourlyDistribution: number[];  // 24 slots for each hour
  dailyDistribution: number[];   // 7 slots for each day of week
  listUsage: Map<string, number>;
  modificationRate: number;      // How often template is modified after use
  completionRate: number;        // Tasks created from template completion rate
}

/**
 * Analyze template usage patterns
 * @param template Template to analyze
 * @param usageHistory Array of historical template usage records
 * @returns Usage pattern analysis
 */
function analyzeTemplateUsage(
  template: Template,
  usageHistory: Array<{ timestamp: Date; listId: string; wasModified: boolean; completed: boolean }>
): TemplateUsagePattern {
  const hourlyDist = new Array(24).fill(0);
  const dailyDist = new Array(7).fill(0);
  const listUsage = new Map<string, number>();
  let modifications = 0;
  let completions = 0;

  usageHistory.forEach(usage => {
    // Track hourly distribution
    const hour = usage.timestamp.getHours();
    hourlyDist[hour]++;

    // Track daily distribution
    const day = usage.timestamp.getDay();
    dailyDist[day]++;

    // Track list usage
    const currentCount = listUsage.get(usage.listId) || 0;
    listUsage.set(usage.listId, currentCount + 1);

    // Track modifications and completions
    if (usage.wasModified) modifications++;
    if (usage.completed) completions++;
  });

  return {
    hourlyDistribution: hourlyDist,
    dailyDistribution: dailyDist,
    listUsage,
    modificationRate: usageHistory.length > 0 ? modifications / usageHistory.length : 0,
    completionRate: usageHistory.length > 0 ? completions / usageHistory.length : 0
  };
}

/**
 * Calculate context similarity between template and current task/list
 * @param template Template to evaluate
 * @param currentTask Current task being created (if any)
 * @param listId Current list ID
 * @returns Similarity score between 0 and 1
 */
async function calculateContextSimilarity(
  template: Template,
  currentTask: Partial<Task> | null,
  listId: string
): Promise<number> {
  try {
    if (!currentTask?.title) return 0;

    const text1 = `${template.name} ${template.description || ''} ${template.settings.title || ''}`;
    const text2 = `${currentTask.title} ${currentTask.description || ''}`;

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

    // Calculate cosine similarity
    const dotProduct = embedding1.reduce((sum: number, val: number, i: number) => 
      sum + (val * (embedding2[i] || 0)), 0);
    
    const norm1 = Math.sqrt(embedding1.reduce((sum: number, val: number) => sum + (val * val), 0));
    const norm2 = Math.sqrt(embedding2.reduce((sum: number, val: number) => sum + (val * val), 0));

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  } catch (error) {
    console.error('Error calculating context similarity:', error);
    return 0;
  }
}

/**
 * Calculate template relevance score
 * @param template Template to evaluate
 * @param usagePattern Template usage pattern analysis
 * @param currentHour Current hour (0-23)
 * @param currentDay Current day (0-6)
 * @param listId Current list ID
 * @returns Score between 0 and 1
 */
function calculateTemplateScore(
  template: Template,
  usagePattern: TemplateUsagePattern,
  currentHour: number,
  currentDay: number,
  listId: string
): number {
  // Time-based relevance
  const hourlyScore = usagePattern.hourlyDistribution[currentHour] / 
    Math.max(1, Math.max(...usagePattern.hourlyDistribution));
  const dailyScore = usagePattern.dailyDistribution[currentDay] /
    Math.max(1, Math.max(...usagePattern.dailyDistribution));

  // List context relevance
  const listScore = (usagePattern.listUsage.get(listId) || 0) /
    Math.max(1, Math.max(...Array.from(usagePattern.listUsage.values())));

  // Success metrics
  const successScore = (usagePattern.completionRate * (1 - usagePattern.modificationRate));

  // Recency bonus
  const daysSinceLastUse = template.lastUsed
    ? (Date.now() - template.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
    : 30;
  const recencyScore = Math.exp(-daysSinceLastUse / 7); // Exponential decay over a week

  // Combine scores with weights
  return (
    0.25 * hourlyScore +
    0.25 * dailyScore +
    0.2 * listScore +
    0.2 * successScore +
    0.1 * recencyScore
  );
}

/**
 * Get template suggestions for task creation
 * @param templates Available templates
 * @param currentTask Current task being created (if any)
 * @param listId Current list ID
 * @param usageHistory Template usage history
 * @returns Array of suggested templates with scores
 */
export async function suggestTemplates(
  templates: Template[],
  currentTask: Partial<Task> | null,
  listId: string,
  usageHistory: Array<{ templateId: string; timestamp: Date; listId: string; wasModified: boolean; completed: boolean }>
): Promise<Array<{ template: Template; score: number }>> {
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();

  // Group usage history by template
  const templateUsageHistory = new Map<string, typeof usageHistory>();
  usageHistory.forEach(record => {
    const history = templateUsageHistory.get(record.templateId) || [];
    history.push(record);
    templateUsageHistory.set(record.templateId, history);
  });

  // Calculate scores for all templates
  const scoredTemplates = await Promise.all(
    templates.map(async template => {
      // Analyze usage patterns
      const usagePattern = analyzeTemplateUsage(
        template,
        templateUsageHistory.get(template.id) || []
      );

      // Calculate base score from patterns
      const baseScore = calculateTemplateScore(
        template,
        usagePattern,
        currentHour,
        currentDay,
        listId
      );

      // Calculate context similarity if we have a current task
      const contextScore = await calculateContextSimilarity(
        template,
        currentTask,
        listId
      );

      // Combine scores (70% base patterns, 30% context)
      const finalScore = 0.7 * baseScore + 0.3 * contextScore;

      return {
        template,
        score: finalScore
      };
    })
  );

  // Sort by score and return top suggestions
  return scoredTemplates
    .sort((a, b) => b.score - a.score)
    .filter(({ score }) => score > 0.3); // Only return reasonably relevant templates
} 