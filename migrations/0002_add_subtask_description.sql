-- Drop the existing subtasks table if it exists
DROP TABLE IF EXISTS subtasks;

-- Create the new table with description column
CREATE TABLE subtasks (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Create temporary table to store existing data
CREATE TABLE IF NOT EXISTS subtasks_temp AS SELECT id, task_id, title, completed, created_at, updated_at FROM subtasks;

-- Restore the existing data
INSERT INTO subtasks (id, task_id, title, completed, created_at, updated_at)
SELECT id, task_id, title, completed, created_at, updated_at FROM subtasks_temp;

-- Drop the temporary table
DROP TABLE IF EXISTS subtasks_temp;

ALTER TABLE subtasks ADD COLUMN description TEXT; 