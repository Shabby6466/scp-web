-- Add branch_id to user_roles table for director branch scoping
ALTER TABLE public.user_roles 
ADD COLUMN branch_id UUID REFERENCES public.school_branches(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_user_roles_branch_id ON public.user_roles(branch_id);

-- Add comment for documentation
COMMENT ON COLUMN public.user_roles.branch_id IS 'Branch assignment for directors - directors can only manage their assigned branch';