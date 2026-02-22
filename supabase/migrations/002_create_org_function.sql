-- Atomic organization creation: inserts org + adds creator as admin member
-- in a single transaction, avoiding the RLS chicken-and-egg problem where
-- the SELECT policy requires membership that doesn't exist yet.

CREATE OR REPLACE FUNCTION create_organization(p_name TEXT, p_connect_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_by UUID,
  connect_code TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO organizations (name, created_by, connect_code)
  VALUES (p_name, v_user_id, p_connect_code)
  RETURNING organizations.id INTO v_org_id;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin');

  RETURN QUERY
    SELECT o.id, o.name, o.created_by, o.connect_code, o.created_at
    FROM organizations o
    WHERE o.id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
