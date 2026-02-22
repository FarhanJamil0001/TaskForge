-- Add Yjs binary state column for CRDT-based collaborative editing
-- yjs_state stores the Yjs document as BYTEA for persistence
-- content remains for backward compatibility and JSON API access
ALTER TABLE project_documents
  ADD COLUMN IF NOT EXISTS yjs_state BYTEA;
