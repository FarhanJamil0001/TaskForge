-- TaskForge initial schema

-- Enums
CREATE TYPE task_status AS ENUM ('backlog', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE org_role AS ENUM ('admin', 'member');
CREATE TYPE create_mode AS ENUM ('instant');

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  connect_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Boards
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_user_id UUID REFERENCES auth.users(id),
  due_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discord_guild_id TEXT,
  discord_channel_id TEXT,
  discord_message_id TEXT,
  discord_author_id TEXT,
  discord_message_url TEXT
);

-- Discord guilds linked to orgs
CREATE TABLE discord_guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discord project channels
CREATE TABLE discord_project_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  create_mode create_mode NOT NULL DEFAULT 'instant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task events for auditing
CREATE TABLE task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_boards_project ON boards(project_id);
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_events_task ON task_events(task_id);
CREATE INDEX idx_discord_guilds_org ON discord_guilds(org_id);
CREATE INDEX idx_discord_channels_project ON discord_project_channels(project_id);
CREATE INDEX idx_discord_channels_channel ON discord_project_channels(channel_id);
CREATE INDEX idx_orgs_connect_code ON organizations(connect_code);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_project_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of an org
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is admin of an org
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: members can view, creator can insert
CREATE POLICY "Users can view orgs they belong to"
  ON organizations FOR SELECT
  USING (is_org_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create orgs"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Org admins can update"
  ON organizations FOR UPDATE
  USING (is_org_admin(id, auth.uid()));

-- Organization members: viewable by fellow members
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (is_org_member(org_id, auth.uid()));

CREATE POLICY "Org admins can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (is_org_admin(org_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Org admins can delete members"
  ON organization_members FOR DELETE
  USING (is_org_admin(org_id, auth.uid()));

-- Projects: org members can view/create
CREATE POLICY "Org members can view projects"
  ON projects FOR SELECT
  USING (is_org_member(org_id, auth.uid()));

CREATE POLICY "Org members can create projects"
  ON projects FOR INSERT
  WITH CHECK (is_org_member(org_id, auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Org members can update projects"
  ON projects FOR UPDATE
  USING (is_org_member(org_id, auth.uid()));

-- Boards: accessible if user is member of the project's org
CREATE POLICY "Org members can view boards"
  ON boards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = boards.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create boards"
  ON boards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = boards.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Org members can update boards"
  ON boards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = boards.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

-- Tasks: accessible via board -> project -> org membership
CREATE POLICY "Org members can view tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = tasks.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = tasks.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Org members can update tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = tasks.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can delete tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = tasks.board_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

-- Discord guilds: org members can view
CREATE POLICY "Org members can view discord guilds"
  ON discord_guilds FOR SELECT
  USING (is_org_member(org_id, auth.uid()));

CREATE POLICY "Org admins can manage discord guilds"
  ON discord_guilds FOR INSERT
  WITH CHECK (is_org_admin(org_id, auth.uid()));

-- Discord project channels: accessible via project org membership
CREATE POLICY "Org members can view discord channels"
  ON discord_project_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = discord_project_channels.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can manage discord channels"
  ON discord_project_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = discord_project_channels.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

-- Task events: accessible via task
CREATE POLICY "Org members can view task events"
  ON task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN boards b ON b.id = t.board_id
      JOIN projects p ON p.id = b.project_id
      WHERE t.id = task_events.task_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create task events"
  ON task_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN boards b ON b.id = t.board_id
      JOIN projects p ON p.id = b.project_id
      WHERE t.id = task_events.task_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );
