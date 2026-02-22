-- Project documents (Document Hub) - Notion-like notes per project

CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_documents_project ON project_documents(project_id);

-- RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view project documents"
  ON project_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can create project documents"
  ON project_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Org members can update project documents"
  ON project_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

CREATE POLICY "Org members can delete project documents"
  ON project_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND is_org_member(p.org_id, auth.uid())
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_project_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_documents_updated_at
  BEFORE UPDATE ON project_documents
  FOR EACH ROW
  EXECUTE FUNCTION set_project_document_updated_at();
