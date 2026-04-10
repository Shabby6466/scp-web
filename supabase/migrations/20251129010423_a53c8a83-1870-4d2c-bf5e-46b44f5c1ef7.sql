-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'NY',
  zip_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  website TEXT,
  license_number TEXT,
  certification_number TEXT,
  min_age INTEGER,
  max_age INTEGER,
  total_capacity INTEGER,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#FFA500',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Add school_id to user_roles for school staff
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Add school_id to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- Add school_id to documents  
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- RLS Policies for schools table
CREATE POLICY "Admins can view all schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all schools"
  ON public.schools FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "School staff can view their own school"
  ON public.schools FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT school_id FROM public.user_roles
      WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role)
    )
  );

CREATE POLICY "School staff can update their own school"
  ON public.schools FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT school_id FROM public.user_roles
      WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role)
    )
  );

CREATE POLICY "Anyone can insert schools during registration"
  ON public.schools FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update students RLS to include school access
DROP POLICY IF EXISTS "Admins and staff can view all students" ON public.students;
DROP POLICY IF EXISTS "School staff can view students at their school" ON public.students;

CREATE POLICY "School staff can view students at their school"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'school_staff'::app_role) OR
    (auth.uid() = parent_id) OR
    (school_id IN (
      SELECT school_id FROM public.user_roles
      WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role)
    ))
  );

-- Update documents RLS to include school access
DROP POLICY IF EXISTS "Admins and staff can view all documents" ON public.documents;
DROP POLICY IF EXISTS "School staff can view documents at their school" ON public.documents;

CREATE POLICY "School staff can view documents at their school"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'school_staff'::app_role) OR
    (auth.uid() = parent_id) OR
    (school_id IN (
      SELECT school_id FROM public.user_roles
      WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role)
    ))
  );

-- Add trigger for updated_at
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();