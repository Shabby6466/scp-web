-- Create director_invitations table
CREATE TABLE public.director_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.school_branches(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  invitation_token text NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz
);

-- Create index for token lookups
CREATE INDEX idx_director_invitations_token ON public.director_invitations(invitation_token);

-- Enable RLS
ALTER TABLE public.director_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for director_invitations
CREATE POLICY "School staff can create director invitations"
ON public.director_invitations FOR INSERT
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "School staff can view director invitations"
ON public.director_invitations FOR SELECT
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "School staff can update director invitations"
ON public.director_invitations FOR UPDATE
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "School staff can delete director invitations"
ON public.director_invitations FOR DELETE
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "Admins can manage all director invitations"
ON public.director_invitations FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create validate_director_invitation function
CREATE OR REPLACE FUNCTION public.validate_director_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  school_id uuid,
  branch_id uuid,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    di.id,
    di.email,
    di.full_name,
    di.school_id,
    di.branch_id,
    true as is_valid
  FROM director_invitations di
  WHERE di.invitation_token = p_token
    AND di.status = 'pending'
    AND di.expires_at > now();
END;
$$;

-- Create helper function for branch-scoped director access
CREATE OR REPLACE FUNCTION public.director_has_branch_access(p_user_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = p_user_id
    AND user_roles.role = 'director'
    AND (
      user_roles.branch_id = p_branch_id
      OR user_roles.branch_id IS NULL  -- Directors without branch can see all
    )
  )
$$;