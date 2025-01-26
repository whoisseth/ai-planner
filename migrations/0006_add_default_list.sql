-- Create a default list if it doesn't exist
INSERT OR IGNORE INTO lists (id, user_id, name, is_default, sort_order, created_at, updated_at)
VALUES ('1', 1, 'Default List', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); 