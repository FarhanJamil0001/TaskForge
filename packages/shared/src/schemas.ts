import { z } from 'zod';

export const taskStatusEnum = z.enum(['backlog', 'in_progress', 'done', 'needs_testing']);
export const taskPriorityEnum = z.enum(['low', 'medium', 'high']);
export const orgRoleEnum = z.enum(['admin', 'member']);

export const connectGuildSchema = z.object({
  guild_id: z.string().min(1),
  guild_name: z.string().min(1),
  org_id: z.string().uuid(),
  connect_code: z.string().min(1),
});

export const createModeEnum = z.enum(['instant', 'reply_only']);

export const linkChannelSchema = z.object({
  guild_id: z.string().min(1),
  channel_id: z.string().min(1),
  project_id: z.string().uuid(),
  create_mode: createModeEnum.optional().default('instant'),
  alias: z.string().min(1).max(32).optional(),
});

export const createTaskFromBotSchema = z.object({
  guild_id: z.string().min(1),
  channel_id: z.string().min(1),
  project_id: z.string().uuid().optional(),
  project_alias: z.string().min(1).max(32).optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(4000).nullable().optional(),
  priority: taskPriorityEnum.optional().default('medium'),
  due_date: z.string().nullable().optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  discord_message_id: z.string().nullable().optional(),
  discord_author_id: z.string().nullable().optional(),
  discord_message_url: z.string().url().nullable().optional(),
});

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  org_id: z.string().uuid(),
});

export const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
  project_id: z.string().uuid(),
});

export const createTaskSchema = z.object({
  board_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(4000).nullable().optional(),
  status: taskStatusEnum.optional().default('backlog'),
  priority: taskPriorityEnum.optional().default('medium'),
  assignee_user_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  group_id: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  group_id: z.string().uuid().nullable().optional(),
});

export const completeTaskFromBotSchema = z.object({
  discord_message_id: z.string().min(1),
  guild_id: z.string().min(1),
  channel_id: z.string().min(1),
});

export const deleteTaskFromBotSchema = z.object({
  discord_message_id: z.string().min(1),
  guild_id: z.string().min(1),
  channel_id: z.string().min(1),
});

export const unlinkChannelSchema = z.object({
  guild_id: z.string().min(1),
  channel_id: z.string().min(1),
  project_id: z.string().uuid().optional(),
  project_alias: z.string().min(1).max(32).optional(),
});

export type CompleteTaskFromBotPayload = z.infer<typeof completeTaskFromBotSchema>;
export type DeleteTaskFromBotPayload = z.infer<typeof deleteTaskFromBotSchema>;
export type ConnectGuildPayload = z.infer<typeof connectGuildSchema>;
export type LinkChannelPayload = z.infer<typeof linkChannelSchema>;
export type UnlinkChannelPayload = z.infer<typeof unlinkChannelSchema>;
export type CreateTaskFromBotPayload = z.infer<typeof createTaskFromBotSchema>;
export type CreateOrgPayload = z.infer<typeof createOrgSchema>;
export type CreateProjectPayload = z.infer<typeof createProjectSchema>;
export type CreateBoardPayload = z.infer<typeof createBoardSchema>;
export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>;
