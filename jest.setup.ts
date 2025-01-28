import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock the getCurrentUser function
jest.mock('@/lib/session', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve({ id: 'test-user-id' })),
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

// Mock the database
jest.mock('@/db', () => {
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
    description: 'Test Description',
    completed: false,
    dueDate: null,
    dueTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    db: {
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => ({
            get: jest.fn(() => mockTask),
          })),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => ({
              get: jest.fn(() => mockTask),
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        where: jest.fn(),
      })),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => [mockTask]),
            all: jest.fn(() => []),
          })),
        })),
      })),
    },
    tasks: {
      userId: 'userId',
      starred: 'starred',
      createdAt: 'createdAt',
    },
    subtasks: {
      taskId: 'taskId',
    },
  };
}); 