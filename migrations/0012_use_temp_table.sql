-- Create temporary tables with new structure
CREATE TABLE tasks_new (
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

CREATE TABLE subtasks_new (
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

-- Copy data from old tables if they exist
INSERT OR IGNORE INTO tasks_new 
SELECT id, user_id, list_id, title, description, completed, starred, priority, 
       NULL as due_date, NULL as due_time, 
       CURRENT_TIMESTAMP as created_at, CURRENT_TIMESTAMP as updated_at
FROM tasks;

INSERT OR IGNORE INTO subtasks_new 
SELECT id, task_id, title, description, completed, 
       NULL as due_date, NULL as due_time, 
       CURRENT_TIMESTAMP as created_at, CURRENT_TIMESTAMP as updated_at
FROM subtasks;

-- Drop old tables
DROP TABLE IF EXISTS subtasks;
DROP TABLE IF EXISTS tasks;

-- Rename new tables to final names
ALTER TABLE tasks_new RENAME TO tasks;
ALTER TABLE subtasks_new RENAME TO subtasks; 