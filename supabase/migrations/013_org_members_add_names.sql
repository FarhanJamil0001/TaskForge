-- Add first_name and last_name to get_org_members_with_email (from auth.users raw_user_meta_data)
-- Must DROP first because return type (OUT params) is changing
DROP FUNCTION IF EXISTS get_org_members_with_email(uuid);

CREATE OR REPLACE FUNCTION get_org_members_with_email(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role org_role,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_org_member(p_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN QUERY
    SELECT
      om.id,
      om.user_id,
      om.role,
      u.email::TEXT,
      COALESCE(u.raw_user_meta_data->>'first_name', '')::TEXT,
      COALESCE(u.raw_user_meta_data->>'last_name', '')::TEXT,
      om.created_at
    FROM organization_members om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
    ORDER BY om.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
