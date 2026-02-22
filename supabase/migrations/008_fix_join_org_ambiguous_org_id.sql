-- Fix: column reference "org_id" is ambiguous in join_organization_by_code
-- The RETURNS TABLE (org_id, org_name) creates output columns that shadow
-- organization_members.org_id. Qualify the column reference to resolve ambiguity.

CREATE OR REPLACE FUNCTION join_organization_by_code(p_join_code TEXT)
RETURNS TABLE (org_id UUID, org_name TEXT) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT o.id, o.name INTO v_org
  FROM organizations o
  WHERE o.join_code = upper(trim(p_join_code));

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Invalid join code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = v_org.id AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this organization';
  END IF;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org.id, v_user_id, 'member');

  RETURN QUERY SELECT v_org.id, v_org.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
