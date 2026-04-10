-- Create teacher_positions table (define available roles/positions)
CREATE TABLE public.teacher_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_education_level TEXT,
  min_credits INTEGER DEFAULT 0,
  min_ece_credits INTEGER DEFAULT 0,
  min_years_experience INTEGER DEFAULT 0,
  requires_cda BOOLEAN DEFAULT false,
  requires_state_cert BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_eligibility_profiles table
CREATE TABLE public.teacher_eligibility_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  education_level TEXT,
  education_field TEXT,
  total_credits INTEGER DEFAULT 0,
  ece_credits INTEGER DEFAULT 0,
  years_experience INTEGER DEFAULT 0,
  resume_path TEXT,
  cda_credential BOOLEAN DEFAULT false,
  state_certification TEXT,
  first_aid_certified BOOLEAN DEFAULT false,
  cpr_certified BOOLEAN DEFAULT false,
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  ai_analysis JSONB,
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id)
);

-- Add position_id to teachers table
ALTER TABLE public.teachers ADD COLUMN position_id UUID REFERENCES public.teacher_positions(id);

-- Enable RLS on teacher_positions
ALTER TABLE public.teacher_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_positions
CREATE POLICY "Admins can manage all positions"
ON public.teacher_positions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "School staff can manage positions at their school"
ON public.teacher_positions FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school'::app_role, 'school_staff'::app_role)
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school'::app_role, 'school_staff'::app_role)
));

CREATE POLICY "Directors can manage positions at their school"
ON public.teacher_positions FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'::app_role
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'::app_role
));

-- Enable RLS on teacher_eligibility_profiles
ALTER TABLE public.teacher_eligibility_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_eligibility_profiles
CREATE POLICY "Admins can manage all eligibility profiles"
ON public.teacher_eligibility_profiles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "School staff can manage eligibility profiles at their school"
ON public.teacher_eligibility_profiles FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school'::app_role, 'school_staff'::app_role)
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('school'::app_role, 'school_staff'::app_role)
));

CREATE POLICY "Directors can manage eligibility profiles at their school"
ON public.teacher_eligibility_profiles FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'::app_role
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'director'::app_role
));

-- Create updated_at triggers
CREATE TRIGGER update_teacher_positions_updated_at
BEFORE UPDATE ON public.teacher_positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_eligibility_profiles_updated_at
BEFORE UPDATE ON public.teacher_eligibility_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();