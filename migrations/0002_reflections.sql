CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL DEFAULT '',
  task_title TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reflections_user_created ON reflections (user_id, created_at DESC);
