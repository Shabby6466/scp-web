-- Create parent_invitations table
CREATE TABLE IF NOT EXISTS public.parent_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_pending_invitation UNIQUE (school_id, parent_email, status)
);

-- Enable RLS
ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;

-- School staff can view their school's invitations
CREATE POLICY "School staff can view their invitations"
ON public.parent_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.school_id = parent_invitations.school_id
    AND user_roles.role IN ('school', 'school_staff')
  )
);

-- School staff can create invitations for their school
CREATE POLICY "School staff can create invitations"
ON public.parent_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.school_id = parent_invitations.school_id
    AND user_roles.role IN ('school', 'school_staff')
  )
);

-- School staff can update their invitations
CREATE POLICY "School staff can update their invitations"
ON public.parent_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.school_id = parent_invitations.school_id
    AND user_roles.role IN ('school', 'school_staff')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_parent_invitations_token ON public.parent_invitations(invitation_token);
CREATE INDEX idx_parent_invitations_school_email ON public.parent_invitations(school_id, parent_email);

-- Add trigger for updated_at
CREATE TRIGGER update_parent_invitations_updated_at
  BEFORE UPDATE ON public.parent_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();