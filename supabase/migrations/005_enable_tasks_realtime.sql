-- Enable Supabase Realtime for the tasks table
-- This allows clients to subscribe to INSERT, UPDATE, DELETE events
-- so the web app updates instantly when tasks change (e.g. from Discord)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;
END $$;
