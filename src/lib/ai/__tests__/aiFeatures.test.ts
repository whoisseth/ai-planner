/**
 * @file aiFeatures.test.ts
 * @description Test suite for AI-powered features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestTags } from '../tagSuggestionAI';
import { suggestDependencies } from '../dependencyAI';
import { 
  calculateOptimalReminderTime,
  analyzeDependencyNotification,
  generateNotificationContent
} from '../notificationAI';
import type { Task } from '../types';
import type { Tag } from '@/db/schema';

// Mock Cohere client
vi.mock('cohere-ai', () => ({
  CohereClient: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue({
      embeddings: [
        [0.1, 0.2, 0.3],
        [0.2, 0.3, 0.4]
      ]
    })
  }))
}));

describe('AI Features', () => {
  let mockTask: Task;
  let mockTags: Tag[];
  let mockOtherTasks: Task[];

  beforeEach(() => {
    // Setup mock task
    mockTask = {
      id: 'task1',
      title: 'Test Task',
      description: 'Test description',
      completed: false,
      tags: ['test', 'important'],
      settings: {
        tags: ['test', 'important'],
        priority: 'Medium',
        estimatedDuration: 60
      },
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user1',
      listId: 'list1',
      type: 'main' as const,
      parentId: null,
      starred: false,
      dueDate: new Date(),
      dueTime: '12:00',
      reminder: null,
      isDeleted: false,
      deletedAt: null,
      sortOrder: 0,
      priority: 'Medium' as const
    };

    // Setup mock tags
    mockTags = [
      {
        id: 'tag1',
        name: 'test',
        userId: 'user1',
        color: '#ff0000',
        usageCount: 5,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'tag2',
        name: 'important',
        userId: 'user1',
        color: '#00ff00',
        usageCount: 3,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Setup mock other tasks
    mockOtherTasks = [
      {
        ...mockTask,
        id: 'task2',
        title: 'Related Task',
        description: 'This task is related',
        tags: ['test']
      },
      {
        ...mockTask,
        id: 'task3',
        title: 'Unrelated Task',
        description: 'This task is not related',
        tags: ['other']
      }
    ];
  });

  describe('Tag Suggestions', () => {
    it('should suggest relevant tags based on content and usage', async () => {
      const suggestions = await suggestTags(mockTask, mockTags, 'user1');
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('tag');
      expect(suggestions[0]).toHaveProperty('score');
    });

    it('should prioritize frequently used tags', async () => {
      const frequentTag = mockTags[0]; // tag with higher usageCount
      const suggestions = await suggestTags(mockTask, mockTags, 'user1');
      
      const frequentTagSuggestion = suggestions.find(s => s.tag.id === frequentTag.id);
      expect(frequentTagSuggestion).toBeDefined();
      expect(frequentTagSuggestion?.score).toBeGreaterThan(0.3);
    });
  });

  describe('Dependency Suggestions', () => {
    it('should suggest relevant dependencies based on content similarity', async () => {
      const suggestions = await suggestDependencies(mockTask, mockOtherTasks, 'user1');
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('task');
      expect(suggestions[0]).toHaveProperty('score');
    });

    it('should not suggest completed tasks as dependencies', async () => {
      const completedTask = { ...mockOtherTasks[0], completed: true };
      const suggestions = await suggestDependencies(
        mockTask,
        [completedTask, ...mockOtherTasks.slice(1)],
        'user1'
      );
      
      const hasCompletedTask = suggestions.some(s => s.task.id === completedTask.id);
      expect(hasCompletedTask).toBe(false);
    });
  });

  describe('Notification System', () => {
    it('should calculate optimal reminder times', async () => {
      const optimalTime = await calculateOptimalReminderTime(
        mockTask,
        [],
        'user1'
      );
      
      expect(optimalTime).toBeInstanceOf(Date);
    });

    it('should analyze dependency notifications', async () => {
      const analysis = await analyzeDependencyNotification(
        mockTask,
        mockOtherTasks,
        'user1'
      );
      
      expect(analysis).toHaveProperty('shouldNotify');
      expect(analysis).toHaveProperty('priority');
    });

    it('should generate personalized notification content', async () => {
      const content = await generateNotificationContent(
        mockTask,
        'reminder',
        'user1'
      );
      
      expect(content).toHaveProperty('title');
      expect(content).toHaveProperty('body');
      expect(content).toHaveProperty('priority');
    });
  });
}); 