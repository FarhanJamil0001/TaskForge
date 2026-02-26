export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'needs_testing';
export type TaskPriority = 'low' | 'medium' | 'high';
export type OrgRole = 'admin' | 'member';
export type CreateMode = 'instant' | 'reply_only';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export interface Organization {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  connect_code: string | null;
  join_code: string | null;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_user_id: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  discord_guild_id: string | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  discord_author_id: string | null;
  discord_message_url: string | null;
}

export interface BoardGroup {
  id: string;
  board_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface DiscordGuild {
  id: string;
  org_id: string;
  guild_id: string;
  name: string;
  created_at: string;
}

export interface DiscordProjectChannel {
  id: string;
  project_id: string;
  guild_id: string;
  channel_id: string;
  enabled: boolean;
  create_mode: CreateMode;
  created_at: string;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  status: InviteStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
}
