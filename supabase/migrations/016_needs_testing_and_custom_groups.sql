-- Add "needs_testing" status to existing enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'needs_testing';

-- Custom board groups (user-created tables/sections per board)
CREATE TABLE board_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#784BD1',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_board_groups_board ON board_groups(board_id);

-- Allow tasks to be placed in a custom group
ALTER TABLE tasks ADD COLUMN group_id UUID REFERENCES board_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_group ON tasks(group_id);

-- RLS for board_groups: same access as boards (via project -> org membership)
ALTER TABLE board_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view board groups"
  ON board_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = board_groups.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create board groups"
  ON board_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = board_groups.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can update board groups"
  ON board_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = board_groups.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can delete board groups"
  ON board_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = board_groups.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

-- Enable realtime for board_groups
ALTER PUBLICATION supabase_realtime ADD TABLE board_groups;
