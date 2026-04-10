-- Create school_admin_invitations table
CREATE TABLE public.school_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  admin_name TEXT,
  invitation_token TEXT DEFAULT gen_random_uuid()::text UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days') NOT NULL,
  accepted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.school_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all invitations
CREATE POLICY "Admins can manage school admin invitations" 
  ON public.school_admin_invitations FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow public select for token validation during signup (only pending, non-expired)
CREATE POLICY "Anyone can validate invitation tokens"
  ON public.school_admin_invitations FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- Create index for token lookups
CREATE INDEX idx_school_admin_invitations_token ON public.school_admin_invitations(invitation_token);
CREATE INDEX idx_school_admin_invitations_school ON public.school_admin_invitations(school_id);