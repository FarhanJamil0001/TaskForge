-- Project views (tabs): renamable, addable views per project.
-- Each view is either a board (BoardTable layout) or documents (DocumentHub).

CREATE TABLE project_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('board', 'documents')),
  name TEXT NOT NULL DEFAULT 'Untitled',
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- board_id required when type='board', null when type='documents'
ALTER TABLE project_views ADD CONSTRAINT project_views_board_required
  CHECK (type != 'board' OR board_id IS NOT NULL);

CREATE INDEX idx_project_views_project ON project_views(project_id);
CREATE INDEX idx_project_views_project_position
  ON project_views(project_id, position);

ALTER TABLE project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view project views"
  ON project_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_views.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create project views"
  ON project_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_views.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can update project views"
  ON project_views FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_views.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can delete project views"
  ON project_views FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_views.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

-- Seed existing projects with Main Table + Documents views.
-- For each project with a default board, create Main Table view if no board view exists.
INSERT INTO project_views (project_id, type, name, board_id, position)
SELECT p.id, 'board', 'Main Table', (
  SELECT id FROM boards WHERE project_id = p.id AND is_default = true LIMIT 1
), 0
FROM projects p
WHERE EXISTS (SELECT 1 FROM boards b WHERE b.project_id = p.id AND b.is_default = true)
AND NOT EXISTS (SELECT 1 FROM project_views pv WHERE pv.project_id = p.id AND pv.type = 'board');

-- Add Documents view for projects that don't have it.
INSERT INTO project_views (project_id, type, name, board_id, position)
SELECT p.id, 'documents', 'Documents', NULL, 1
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_views pv
  WHERE pv.project_id = p.id AND pv.type = 'documents'
);
