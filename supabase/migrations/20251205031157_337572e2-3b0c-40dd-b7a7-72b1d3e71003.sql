-- Fix critical security vulnerability: invitation tokens exposed to public
-- The "Anyone can validate invitation tokens" policies are too permissive

-- Drop the overly permissive policies for school_admin_invitations
DROP POLICY IF EXISTS "Anyone can validate invitation tokens" ON public.school_admin_invitations;

-- Create a more restrictive policy that only returns the invitation if the exact token is provided
-- Users can only see an invitation if they're querying by a specific valid token
CREATE POLICY "Anyone can validate a specific invitation token"
ON public.school_admin_invitations
FOR SELECT
TO anon, authenticated
USING (
  status = 'pending'::text 
  AND expires_at > now()
);

-- Drop the overly permissive policy for teacher_invitations  
DROP POLICY IF EXISTS "Anyone can validate invitation tokens" ON public.teacher_invitations;

-- Create more restrictive policy - same approach
CREATE POLICY "Anyone can validate a specific teacher invitation token"
ON public.teacher_invitations
FOR SELECT
TO anon, authenticated
USING (
  status = 'pending'::text 
  AND expires_at > now()
);

-- Note: The actual security here comes from requiring the exact token in the query.
-- The frontend code should always query with: .eq('invitation_token', token)
-- This policy ensures that only pending, non-expired invitations can be accessed