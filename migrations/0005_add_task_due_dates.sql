-- Add due_date and due_time columns to tasks if they don't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT;

-- Add due_date and due_time columns to subtasks if they don't exist
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS due_date INTEGER;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS due_time TEXT;

-- Add missing foreign key columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id TEXT NOT NULL DEFAULT '1';
ALTER TABLE tasks ADD FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE;

-- Add missing timestamps
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at INTEGER DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at INTEGER DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS created_at INTEGER DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS updated_at INTEGER DEFAULT CURRENT_TIMESTAMP; 