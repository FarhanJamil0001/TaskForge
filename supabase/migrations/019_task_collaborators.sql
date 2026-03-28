CREATE TABLE task_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_task_collaborators_task ON task_collaborators(task_id);
CREATE INDEX idx_task_collaborators_user ON task_collaborators(user_id);

ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task collaborators"
  ON task_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN boards b ON b.id = t.board_id
      JOIN projects p ON p.id = b.project_id
      WHERE t.id = task_collaborators.task_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can add task collaborators"
  ON task_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN boards b ON b.id = t.board_id
      JOIN projects p ON p.id = b.project_id
      WHERE t.id = task_collaborators.task_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can remove task collaborators"
  ON task_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN boards b ON b.id = t.board_id
      JOIN projects p ON p.id = b.project_id
      WHERE t.id = task_collaborators.task_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );
