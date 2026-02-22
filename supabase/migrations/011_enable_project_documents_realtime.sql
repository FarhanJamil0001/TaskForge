-- Enable Supabase Realtime for the project_documents table
-- This allows clients to subscribe to INSERT, UPDATE, DELETE events
-- so the web app updates instantly when documents change (collaborative editing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE project_documents;
  END IF;
END $$;
