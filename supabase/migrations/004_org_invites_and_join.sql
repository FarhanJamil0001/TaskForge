-- Migration 004: Organization invites, join-by-code, and member management

-- ============================================================
-- 1. Add join_code column to organizations
-- ============================================================

ALTER TABLE organizations ADD COLUMN join_code TEXT UNIQUE;

UPDATE organizations
SET join_code = upper(substr(md5(random()::text), 1, 8))
WHERE join_code IS NULL;

ALTER TABLE organizations ALTER COLUMN join_code SET NOT NULL;

-- ============================================================
-- 2. Update create_organization to generate join_code
-- ============================================================

DROP FUNCTION IF EXISTS create_organization(TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_organization(p_name TEXT, p_connect_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_by UUID,
  connect_code TEXT,
  join_code TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_join_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_join_code := upper(substr(md5(random()::text), 1, 8));

  INSERT INTO organizations (name, created_by, connect_code, join_code)
  VALUES (p_name, v_user_id, p_connect_code, v_join_code)
  RETURNING organizations.id INTO v_org_id;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'admin');

  RETURN QUERY
    SELECT o.id, o.name, o.created_by, o.connect_code, o.join_code, o.created_at
    FROM organizations o
    WHERE o.id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Org invites table
-- ============================================================

CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE UNIQUE INDEX idx_org_invites_pending
  ON org_invites (org_id, lower(email)) WHERE status = 'pending';
CREATE INDEX idx_org_invites_email ON org_invites(lower(email));
CREATE INDEX idx_org_invites_org ON org_invites(org_id);

-- ============================================================
-- 4. RLS for org_invites
-- ============================================================

ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View invites"
  ON org_invites FOR SELECT
  USING (
    is_org_member(org_id, auth.uid())
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "Admins create invites"
  ON org_invites FOR INSERT
  WITH CHECK (is_org_admin(org_id, auth.uid()));

CREATE POLICY "Admins update invites"
  ON org_invites FOR UPDATE
  USING (is_org_admin(org_id, auth.uid()));

-- ============================================================
-- 5. Allow admins to update org member roles
-- ============================================================

CREATE POLICY "Org admins can update members"
  ON organization_members FOR UPDATE
  USING (is_org_admin(org_id, auth.uid()));

-- ============================================================
-- 6. RPC: Join organization by code
-- ============================================================

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
    SELECT 1 FROM organization_members
    WHERE org_id = v_org.id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this organization';
  END IF;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org.id, v_user_id, 'member');

  RETURN QUERY SELECT v_org.id, v_org.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. RPC: Accept org invite
-- ============================================================

CREATE OR REPLACE FUNCTION accept_org_invite(p_invite_id UUID)
RETURNS TABLE (org_id UUID, org_name TEXT) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_invite RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_user_email := lower(auth.jwt() ->> 'email');

  SELECT i.id, i.org_id, i.email, i.role, i.status, i.expires_at, o.name AS org_name
  INTO v_invite
  FROM org_invites i
  JOIN organizations o ON o.id = i.org_id
  WHERE i.id = p_invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'Invite is no longer valid';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  IF lower(v_invite.email) != v_user_email THEN
    RAISE EXCEPTION 'This invite was sent to a different email address';
  END IF;

  -- Already a member — just mark accepted
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = v_invite.org_id AND user_id = v_user_id
  ) THEN
    UPDATE org_invites SET status = 'accepted' WHERE id = p_invite_id;
    RETURN QUERY SELECT v_invite.org_id, v_invite.org_name;
    RETURN;
  END IF;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, v_invite.role);

  UPDATE org_invites SET status = 'accepted' WHERE id = p_invite_id;

  RETURN QUERY SELECT v_invite.org_id, v_invite.org_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. RPC: Get org members with email (joins auth.users)
-- ============================================================

CREATE OR REPLACE FUNCTION get_org_members_with_email(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role org_role,
  email TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_org_member(p_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN QUERY
    SELECT om.id, om.user_id, om.role, u.email::TEXT, om.created_at
    FROM organization_members om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.org_id = p_org_id
    ORDER BY om.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
