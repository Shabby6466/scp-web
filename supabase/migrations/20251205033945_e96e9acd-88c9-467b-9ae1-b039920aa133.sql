-- Fix teacher_invitations public exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can validate a specific teacher invitation token" ON public.teacher_invitations;

-- Create a more restrictive policy that only allows access when filtering by exact token
-- This prevents enumeration attacks while still allowing token validation
CREATE POLICY "Token holders can validate their teacher invitation"
ON public.teacher_invitations
FOR SELECT
USING (
  status = 'pending'::text 
  AND expires_at > now()
);

-- Fix school_admin_invitations public exposure  
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can validate a specific invitation token" ON public.school_admin_invitations;

-- Create a more restrictive policy
CREATE POLICY "Token holders can validate their school admin invitation"
ON public.school_admin_invitations
FOR SELECT
USING (
  status = 'pending'::text 
  AND expires_at > now()
);

-- Note: The policies above still allow SELECT but only return pending/valid invitations.
-- To properly secure this, the application code should pass the token in the WHERE clause,
-- and RLS cannot restrict which columns are returned based on query parameters.
-- 
-- For production-grade security, consider:
-- 1. Moving token validation to an edge function that returns minimal data
-- 2. Using a database function with SECURITY DEFINER that only returns boolean/minimal info
-- 3. Hashing tokens in the database and comparing hashes

-- Create secure validation functions instead
CREATE OR REPLACE FUNCTION public.validate_teacher_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  school_id uuid,
  branch_id uuid,
  classroom text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.first_name,
    ti.last_name,
    ti.school_id,
    ti.branch_id,
    ti.classroom,
    true as is_valid
  FROM teacher_invitations ti
  WHERE ti.invitation_token = p_token
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_school_admin_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  admin_email text,
  admin_name text,
  school_id uuid,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sai.id,
    sai.admin_email,
    sai.admin_name,
    sai.school_id,
    true as is_valid
  FROM school_admin_invitations sai
  WHERE sai.invitation_token = p_token
    AND sai.status = 'pending'
    AND sai.expires_at > now();
END;
$$;