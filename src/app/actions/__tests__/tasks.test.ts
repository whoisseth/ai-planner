import { createTask, updateTask, deleteTask, getTasks, getStarredTasks } from '../tasks';
import { db } from '@/db';
import { getCurrentUser } from '@/lib/session';

// Mock implementations
const mockTask = {
  id: 'test-task-id',
  userId: 'test-user-id',
  listId: 'test-list-id',
  title: 'Test Task',
  description: 'Test Description',
  completed: false,
  starred: false,
  priority: 'Medium',
  dueDate: new Date(),
  dueTime: '12:00',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubtask = {
  id: 'test-subtask-id',
  taskId: 'test-task-id',
  title: 'Test Subtask',
  description: 'Test Subtask Description',
  completed: false,
  dueDate: null,
  dueTime: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Tasks Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      // Mock the db insert
      (db.insert as jest.Mock).mockImplementation(() => ({
        values: () => ({
          returning: () => ({
            get: () => mockTask,
          }),
        }),
      }));

      const result = await createTask('test-list-id', {
        title: 'Test Task',
        description: 'Test Description',
        priority: 'Medium',
      });

      expect(result).toEqual({
        ...mockTask,
        subtasks: [],
        dueDate: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when user is not authenticated', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      await expect(createTask('test-list-id', { title: 'Test' }))
        .rejects
        .toThrow('Not authenticated');
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      
      (db.update as jest.Mock).mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: () => ({
              get: () => updatedTask,
            }),
          }),
        }),
      }));

      (db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            all: () => [],
          }),
        }),
      }));

      const result = await updateTask('test-task-id', { title: 'Updated Title' });

      expect(result).toEqual({
        ...updatedTask,
        subtasks: [],
        dueDate: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      await deleteTask('test-task-id');

      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      await expect(deleteTask('test-task-id'))
        .rejects
        .toThrow('Not authenticated');
    });
  });

  describe('getTasks', () => {
    it('should get all tasks for authenticated user', async () => {
      (db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => [mockTask],
          }),
        }),
      }));

      // Mock subtasks query
      const secondSelect = jest.fn(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => [],
          }),
        }),
      }));

      // Set up the mock to return different implementations on subsequent calls
      (db.select as jest.Mock)
        .mockImplementationOnce(() => ({
          from: () => ({
            where: () => ({
              orderBy: () => [mockTask],
            }),
          }),
        }))
        .mockImplementationOnce(secondSelect);

      const result = await getTasks();

      expect(result).toEqual([
        {
          ...mockTask,
          subtasks: [],
          dueDate: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);
    });

    it('should throw error when user is not authenticated', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      await expect(getTasks())
        .rejects
        .toThrow('Not authenticated');
    });
  });

  describe('getStarredTasks', () => {
    it('should get starred tasks for authenticated user', async () => {
      const starredTask = { ...mockTask, starred: true };
      
      // Mock tasks query
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => [starredTask],
          }),
        }),
      }));

      // Mock subtasks query with an array
      (db.select as jest.Mock).mockImplementationOnce(() => ({
        from: () => ({
          where: () => [mockSubtask],
        }),
      }));

      const result = await getStarredTasks();

      expect(result).toEqual([
        {
          ...starredTask,
          subtasks: [{
            ...mockSubtask,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            description: expect.any(String),
          }],
          dueDate: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);
    });

    it('should throw error when user is not authenticated', async () => {
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      await expect(getStarredTasks())
        .rejects
        .toThrow('Not authenticated');
    });
  });
}); 