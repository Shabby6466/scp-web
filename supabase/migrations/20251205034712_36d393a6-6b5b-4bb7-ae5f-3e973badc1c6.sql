-- Drop the overly permissive SELECT policy on teacher_invitations
-- The secure RPC function validate_teacher_invitation(p_token) handles token validation safely
DROP POLICY IF EXISTS "Token holders can validate their teacher invitation" ON teacher_invitations;

-- Also drop the similar policy on school_admin_invitations for consistency
DROP POLICY IF EXISTS "Token holders can validate their school admin invitation" ON school_admin_invitations;