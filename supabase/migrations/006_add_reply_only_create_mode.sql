-- Add reply_only to create_mode enum for channels that only create tasks via !task or /task
ALTER TYPE create_mode ADD VALUE IF NOT EXISTS 'reply_only';
