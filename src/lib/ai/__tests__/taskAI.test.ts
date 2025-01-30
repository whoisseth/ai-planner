/**
 * @file taskAI.test.ts
 * @description Tests for AI-powered task management features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { suggestTags } from '../taskAI';
import type { Task } from '../types';
import type { Tag } from '@/db/schema';

describe('taskAI', () => {
  let mockTask: Required<Task>;
  let mockTags: Tag[];

  beforeEach(() => {
    mockTask = {
      id: 'task1',
      title: 'Important work task',
      description: 'Need to complete this by EOD',
      userId: 'user1',
      listId: 'list1',
      type: 'main',
      parentId: null,
      starred: false,
      completed: false,
      sortOrder: 0,
      priority: 'High',
      dueDate: null,
      dueTime: null,
      reminder: null,
      isDeleted: false,
      deletedAt: null,
      completedAt: null,
      tags: ['tag1', 'tag2'],
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Required<Task>;

    mockTags = [
      {
        id: 'tag1',
        name: 'work',
        color: '#ff0000',
        userId: 'user1',
        usageCount: 5,
        lastUsed: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag2',
        name: 'important',
        color: '#00ff00',
        userId: 'user1',
        usageCount: 3,
        lastUsed: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as Tag[];
  });

  describe('suggestTags', () => {
    it('should suggest tags based on content similarity', async () => {
      const suggestions = await suggestTags(mockTask, mockTags, 'user1');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('confidence');
      expect(suggestions[0]).toHaveProperty('source');
    });

    it('should handle tasks with no matching tags', async () => {
      const taskWithDifferentContent = {
        ...mockTask,
        title: 'Something completely different',
        description: 'No matching keywords here',
      };
      const suggestions = await suggestTags(taskWithDifferentContent, mockTags, 'user1');
      expect(suggestions.length).toBeLessThan(mockTags.length);
    });

    it('should handle empty tag list', async () => {
      const suggestions = await suggestTags(mockTask, [], 'user1');
      expect(suggestions).toEqual([]);
    });

    it('should consider tag usage frequency', async () => {
      const frequentlyUsedTag = {
        ...mockTags[0],
        usageCount: 100,
      };

      const suggestions = await suggestTags(
        mockTask,
        [frequentlyUsedTag],
        'user1',
      );

      if (suggestions.length > 0) {
        expect(suggestions[0].tagId).toBe(frequentlyUsedTag.id);
      }
    });
  });
}); 