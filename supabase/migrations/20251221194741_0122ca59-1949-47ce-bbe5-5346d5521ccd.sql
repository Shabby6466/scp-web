-- Create parents table (separate from auth profiles - for imported/non-auth parents)
CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- linked when parent creates account
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parents table
CREATE POLICY "Admins can manage all parents"
ON public.parents FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "School staff can manage parents at their school"
ON public.parents FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "Directors can manage parents at their school"
ON public.parents FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'
));

-- Create student_parents join table
CREATE TABLE public.student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  relationship_type text DEFAULT 'guardian',
  is_primary_contact boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

-- Enable RLS
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_parents table
CREATE POLICY "Admins can manage all student_parents"
ON public.student_parents FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "School staff can manage student_parents at their school"
ON public.student_parents FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "Directors can manage student_parents at their school"
ON public.student_parents FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'
));

-- Create import_jobs table for audit/debugging
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.school_branches(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_rows integer DEFAULT 0,
  created_students integer DEFAULT 0,
  updated_students integer DEFAULT 0,
  created_parents integer DEFAULT 0,
  matched_parents integer DEFAULT 0,
  linked_relationships integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_report_path text,
  import_type text DEFAULT 'both' CHECK (import_type IN ('students', 'parents', 'both')),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_jobs table
CREATE POLICY "Admins can manage all import_jobs"
ON public.import_jobs FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "School staff can view import_jobs at their school"
ON public.import_jobs FOR SELECT
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "School staff can create import_jobs at their school"
ON public.import_jobs FOR INSERT
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school', 'school_staff')
));

CREATE POLICY "Directors can view import_jobs at their school"
ON public.import_jobs FOR SELECT
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'
));

CREATE POLICY "Directors can create import_jobs at their school"
ON public.import_jobs FOR INSERT
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'
));

-- Add indexes for performance
CREATE INDEX idx_parents_school_id ON public.parents(school_id);
CREATE INDEX idx_parents_email ON public.parents(email);
CREATE INDEX idx_student_parents_student_id ON public.student_parents(student_id);
CREATE INDEX idx_student_parents_parent_id ON public.student_parents(parent_id);
CREATE INDEX idx_import_jobs_school_id ON public.import_jobs(school_id);

-- Create trigger for updated_at on parents
CREATE TRIGGER update_parents_updated_at
BEFORE UPDATE ON public.parents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();