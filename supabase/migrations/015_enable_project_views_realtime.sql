-- Enable Supabase Realtime for project_views
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_views;
  END IF;
END $$;
