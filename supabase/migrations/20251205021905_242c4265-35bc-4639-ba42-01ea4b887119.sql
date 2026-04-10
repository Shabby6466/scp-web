-- Create teacher_invitations table
CREATE TABLE public.teacher_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.school_branches(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  classroom TEXT,
  invitation_token TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(invitation_token)
);

-- Enable RLS
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins can manage teacher invitations"
ON public.teacher_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- School staff can create and view invitations for their school
CREATE POLICY "School staff can create teacher invitations"
ON public.teacher_invitations
FOR INSERT
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "School staff can view their school invitations"
ON public.teacher_invitations
FOR SELECT
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role IN ('school', 'school_staff')
));

-- Directors can manage invitations for their school
CREATE POLICY "Directors can create teacher invitations"
ON public.teacher_invitations
FOR INSERT
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'director'
));

CREATE POLICY "Directors can view their school invitations"
ON public.teacher_invitations
FOR SELECT
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'director'
));

CREATE POLICY "Directors can update their school invitations"
ON public.teacher_invitations
FOR UPDATE
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'director'
));

-- Anyone can validate invitation tokens (for accepting invitations)
CREATE POLICY "Anyone can validate invitation tokens"
ON public.teacher_invitations
FOR SELECT
USING (status = 'pending' AND expires_at > now());