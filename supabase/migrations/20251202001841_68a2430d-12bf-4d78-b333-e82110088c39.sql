-- Create school_branches table for multiple locations per school
CREATE TABLE IF NOT EXISTS public.school_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'NY',
  zip_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  min_age INTEGER,
  max_age INTEGER,
  total_capacity INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Enable RLS
ALTER TABLE public.school_branches ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX idx_school_branches_school_id ON public.school_branches(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_branches_active ON public.school_branches(is_active) WHERE deleted_at IS NULL;

-- RLS Policies for school_branches

-- Admins can view all branches
CREATE POLICY "Admins can view all school branches"
ON public.school_branches
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all branches
CREATE POLICY "Admins can insert school branches"
ON public.school_branches
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update school branches"
ON public.school_branches
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- School staff can view their school's branches
CREATE POLICY "School staff can view their school branches"
ON public.school_branches
FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('school'::app_role, 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

-- School staff can insert branches for their school
CREATE POLICY "School staff can insert their school branches"
ON public.school_branches
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('school'::app_role, 'school_staff'::app_role)
  )
);

-- School staff can update their school's branches
CREATE POLICY "School staff can update their school branches"
ON public.school_branches
FOR UPDATE
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('school'::app_role, 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

-- Directors can view branches at their school
CREATE POLICY "Directors can view branches at their school"
ON public.school_branches
FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'director'::app_role
  )
  AND deleted_at IS NULL
);

-- Directors can manage branches at their school
CREATE POLICY "Directors can insert branches at their school"
ON public.school_branches
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'director'::app_role
  )
);

CREATE POLICY "Directors can update branches at their school"
ON public.school_branches
FOR UPDATE
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'director'::app_role
  )
  AND deleted_at IS NULL
);

-- Add trigger for updated_at
CREATE TRIGGER update_school_branches_updated_at
BEFORE UPDATE ON public.school_branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add students.branch_id to link students to specific branches
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.school_branches(id);

CREATE INDEX idx_students_branch_id ON public.students(branch_id) WHERE deleted_at IS NULL;

-- Add teachers.branch_id to link teachers to specific branches
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.school_branches(id);

CREATE INDEX idx_teachers_branch_id ON public.teachers(branch_id) WHERE deleted_at IS NULL;