-- Add missing columns to tasks table if they don't exist
SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'due_date')
  THEN 'ALTER TABLE tasks ADD COLUMN due_date INTEGER'
END;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'due_time')
  THEN 'ALTER TABLE tasks ADD COLUMN due_time TEXT'
END;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'created_at')
  THEN 'ALTER TABLE tasks ADD COLUMN created_at INTEGER DEFAULT CURRENT_TIMESTAMP'
END;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'updated_at')
  THEN 'ALTER TABLE tasks ADD COLUMN updated_at INTEGER DEFAULT CURRENT_TIMESTAMP'
END;

-- Add missing columns to subtasks table if they don't exist
SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('subtasks') WHERE name = 'due_date')
  THEN 'ALTER TABLE subtasks ADD COLUMN due_date INTEGER'
END;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('subtasks') WHERE name = 'due_time')
  THEN 'ALTER TABLE subtasks ADD COLUMN due_time TEXT'
END;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('subtasks') WHERE name = 'created_at')
  THEN 'ALTER TABLE subtasks ADD COLUMN created_at INTEGER DEFAULT CURRENT_TIMESTAMP'
END;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('subtasks') WHERE name = 'updated_at')
  THEN 'ALTER TABLE subtasks ADD COLUMN updated_at INTEGER DEFAULT CURRENT_TIMESTAMP'
END; 