/**
 * @file taskAI.test.ts
 * @description Tests for AI-powered task management features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestTags, suggestTemplates } from '../taskAI';
import type { Task } from '../types';
import type { Tag, Template } from '@/db/schema';

// Mock Cohere client
vi.mock('cohere-ai', () => ({
  CohereClient: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3]]
    }),
    classify: vi.fn().mockResolvedValue({
      classifications: [{
        prediction: 'high'
      }]
    })
  }))
}));

describe('taskAI', () => {
  let mockTask: Task;
  let mockTags: Tag[];
  let mockTemplates: Template[];

  beforeEach(() => {
    mockTask = {
      id: '1',
      title: 'Test task',
      description: 'Test description',
      userId: 'user1',
      listId: 'list1',
      type: 'main',
      parentId: null,
      starred: false,
      completed: false,
      priority: 'Medium' as const,
      dueDate: null,
      dueTime: null,
      reminder: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      sortOrder: 0,
      isDeleted: false,
      deletedAt: null,
      tags: [],  // Initialize with empty tags array
      completedAt: null
    };

    mockTags = [
      {
        id: 'tag1',
        name: 'important',
        userId: 'user1',
        color: '#ff0000',
        usageCount: 5,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'tag2',
        name: 'work',
        userId: 'user1',
        color: '#00ff00',
        usageCount: 3,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'tag3',
        name: 'personal',
        userId: 'user1',
        color: '#0000ff',
        usageCount: 2,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockTemplates = [
      {
        id: 'template1',
        name: 'Work task',
        description: 'Template for work tasks',
        userId: 'user1',
        settings: {
          tags: ['tag1', 'tag2'],
          priority: 'High',
          estimatedDuration: 60
        },
        usageCount: 15,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: false
      }
    ];
  });

  describe('suggestTags', () => {
    it('should suggest tags based on content similarity', async () => {
      const suggestions = await suggestTags(mockTask as Required<Task>, mockTags, 'user1');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('confidence');
        expect(suggestions[0]).toHaveProperty('source');
        expect(suggestions.some(s => s.source === 'content')).toBe(true);
      }
    });

    it('should handle tasks with no tags', async () => {
      const taskWithoutTags = { ...mockTask, tags: [] };
      const suggestions = await suggestTags(taskWithoutTags as Required<Task>, mockTags, 'user1');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle empty tag list', async () => {
      const suggestions = await suggestTags(mockTask as Required<Task>, [], 'user1');
      
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('suggestTemplates', () => {
    it('should suggest templates based on content and tags', async () => {
      const suggestions = await suggestTemplates(mockTask, mockTemplates, 'user1');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('relevance');
        expect(suggestions[0]).toHaveProperty('matchedCriteria');
      }
    });

    it('should handle tasks with no matching templates', async () => {
      const taskWithDifferentPriority = {
        ...mockTask,
        priority: 'Low' as const
      };
      const suggestions = await suggestTemplates(taskWithDifferentPriority, mockTemplates, 'user1');
      
      expect(suggestions.length).toBeLessThan(mockTemplates.length);
    });

    it('should handle empty template list', async () => {
      const suggestions = await suggestTemplates(mockTask, [], 'user1');
      
      expect(suggestions).toHaveLength(0);
    });

    it('should consider template usage frequency', async () => {
      const frequentlyUsedTemplate = {
        ...mockTemplates[0],
        usageCount: 20,
        isPublic: false
      } as Template;
      
      const suggestions = await suggestTemplates(
        mockTask,
        [frequentlyUsedTemplate],
        'user1'
      );
      
      expect(suggestions[0].matchedCriteria).toContain('frequently_used');
    });
  });
}); 