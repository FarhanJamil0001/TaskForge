-- Allow org members to delete projects they belong to
CREATE POLICY "Org members can delete projects"
  ON projects FOR DELETE
  USING (is_org_member(org_id, auth.uid()));
