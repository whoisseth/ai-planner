-- Function to check if a column exists
CREATE TABLE IF NOT EXISTS temp_column_check (dummy INTEGER);
DROP TABLE temp_column_check;

-- Add columns to tasks table if they don't exist
SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'due_date')
  THEN 'ALTER TABLE tasks ADD COLUMN due_date INTEGER'
END WHERE NOT NULL;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('tasks') WHERE name = 'due_time')
  THEN 'ALTER TABLE tasks ADD COLUMN due_time TEXT'
END WHERE NOT NULL;

-- Add columns to subtasks table if they don't exist
SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('subtasks') WHERE name = 'due_date')
  THEN 'ALTER TABLE subtasks ADD COLUMN due_date INTEGER'
END WHERE NOT NULL;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('subtasks') WHERE name = 'due_time')
  THEN 'ALTER TABLE subtasks ADD COLUMN due_time TEXT'
END WHERE NOT NULL; 