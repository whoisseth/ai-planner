-- First, backup existing data
CREATE TABLE IF NOT EXISTS lists_backup AS SELECT * FROM lists;
CREATE TABLE IF NOT EXISTS tasks_backup AS SELECT * FROM tasks;
CREATE TABLE IF NOT EXISTS subtasks_backup AS SELECT * FROM subtasks;

-- Drop existing tables in reverse order of dependencies
DROP TABLE IF EXISTS subtasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS lists;

-- Create lists table
CREATE TABLE lists (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table with all required columns
CREATE TABLE tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  list_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  starred INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'Medium',
  due_date INTEGER,
  due_time TEXT,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

-- Create subtasks table with all required columns
CREATE TABLE subtasks (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  due_date INTEGER,
  due_time TEXT,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create default list if it doesn't exist in backup
INSERT INTO lists (id, user_id, name, is_default, sort_order, created_at, updated_at)
SELECT '1', 1, 'Default List', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM lists_backup WHERE id = '1');

-- Restore data from backups if they exist
INSERT OR IGNORE INTO lists 
SELECT * FROM lists_backup WHERE EXISTS (SELECT 1 FROM lists_backup);

INSERT OR IGNORE INTO tasks 
SELECT * FROM tasks_backup WHERE EXISTS (SELECT 1 FROM tasks_backup);

INSERT OR IGNORE INTO subtasks 
SELECT * FROM subtasks_backup WHERE EXISTS (SELECT 1 FROM subtasks_backup);

-- Drop backup tables
DROP TABLE IF EXISTS lists_backup;
DROP TABLE IF EXISTS tasks_backup;
DROP TABLE IF EXISTS subtasks_backup; 