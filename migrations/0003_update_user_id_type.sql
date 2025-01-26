-- Update tasks table to use TEXT for user_id
CREATE TABLE new_tasks (
  id TEXT PRIMARY KEY,
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
  updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table to new table, converting user_id to TEXT
INSERT INTO new_tasks 
SELECT 
  id,
  CAST(user_id AS TEXT) as user_id,
  list_id,
  title,
  description,
  completed,
  starred,
  priority,
  due_date,
  due_time,
  created_at,
  updated_at
FROM tasks;

-- Drop old table and rename new table
DROP TABLE tasks;
ALTER TABLE new_tasks RENAME TO tasks; 