-- Add position column for document ordering

ALTER TABLE project_documents
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Backfill: set position based on updated_at order for existing rows
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY updated_at DESC) - 1 AS rn
  FROM project_documents
)
UPDATE project_documents pd
SET position = ranked.rn
FROM ranked
WHERE pd.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_project_documents_project_position
  ON project_documents(project_id, position);
