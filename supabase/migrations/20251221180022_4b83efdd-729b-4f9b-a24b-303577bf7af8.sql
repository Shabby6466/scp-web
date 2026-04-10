-- Add inspection_category enum to categorize inspection types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_category') THEN
    CREATE TYPE public.inspection_category AS ENUM ('doh', 'facility_safety');
  END IF;
END $$;

-- Add category column to inspection_types
ALTER TABLE public.inspection_types 
ADD COLUMN IF NOT EXISTS category inspection_category DEFAULT 'facility_safety';

-- Migrate existing data based on name patterns
UPDATE public.inspection_types 
SET category = 'doh' 
WHERE LOWER(name) LIKE '%doh%' OR LOWER(name) LIKE '%health%' OR LOWER(name) = 'nyc doh';

UPDATE public.inspection_types 
SET category = 'facility_safety' 
WHERE LOWER(name) LIKE '%fire%' OR LOWER(name) LIKE '%building%' OR LOWER(name) LIKE '%facility%' OR LOWER(name) LIKE '%safety%';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_inspection_types_category ON public.inspection_types(category);
CREATE INDEX IF NOT EXISTS idx_inspection_types_school_category ON public.inspection_types(school_id, category);

-- ============================================================
-- CERTIFICATIONS MODULE TABLES
-- ============================================================

-- Create certification_types table (templates)
CREATE TABLE IF NOT EXISTS public.certification_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  default_validity_months integer,
  evidence_types text[] DEFAULT ARRAY['document'],
  applies_to text NOT NULL CHECK (applies_to IN ('staff', 'vendor', 'facility', 'other')),
  is_system_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create certification_records table (actual tracked certs)
CREATE TABLE IF NOT EXISTS public.certification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  certification_type_id uuid REFERENCES public.certification_types(id),
  applies_to text NOT NULL CHECK (applies_to IN ('staff', 'vendor', 'facility', 'other')),
  subject_id uuid,
  subject_name text,
  issued_date date,
  expiry_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired', 'not_applicable')),
  owner_user_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create certification_evidence table
CREATE TABLE IF NOT EXISTS public.certification_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_record_id uuid NOT NULL REFERENCES public.certification_records(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('document', 'photo', 'log', 'link')),
  document_id uuid,
  file_path text,
  url text,
  note text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for certification tables
CREATE INDEX IF NOT EXISTS idx_certification_records_school ON public.certification_records(school_id);
CREATE INDEX IF NOT EXISTS idx_certification_records_status ON public.certification_records(status);
CREATE INDEX IF NOT EXISTS idx_certification_records_expiry ON public.certification_records(expiry_date);
CREATE INDEX IF NOT EXISTS idx_certification_records_applies_to ON public.certification_records(applies_to);
CREATE INDEX IF NOT EXISTS idx_certification_evidence_record ON public.certification_evidence(certification_record_id);
CREATE INDEX IF NOT EXISTS idx_certification_evidence_school ON public.certification_evidence(school_id);

-- Enable RLS on certification tables
ALTER TABLE public.certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_evidence ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES FOR CERTIFICATION_TYPES
-- ============================================================

-- Anyone authenticated can view system default certification types
CREATE POLICY "Anyone can view system certification types"
ON public.certification_types
FOR SELECT
USING (is_system_default = true);

-- Admins can manage all certification types
CREATE POLICY "Admins can manage all certification types"
ON public.certification_types
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================
-- RLS POLICIES FOR CERTIFICATION_RECORDS
-- ============================================================

-- Admins can manage all certification records
CREATE POLICY "Admins can manage all certification records"
ON public.certification_records
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Directors can manage certification records at their school
CREATE POLICY "Directors can manage certification records at their school"
ON public.certification_records
FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'director'
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'director'
));

-- School staff can manage certification records at their school
CREATE POLICY "School staff can manage certification records at their school"
ON public.certification_records
FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['school'::app_role, 'school_staff'::app_role])
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['school'::app_role, 'school_staff'::app_role])
));

-- ============================================================
-- RLS POLICIES FOR CERTIFICATION_EVIDENCE
-- ============================================================

-- Admins can manage all certification evidence
CREATE POLICY "Admins can manage all certification evidence"
ON public.certification_evidence
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Directors can manage certification evidence at their school
CREATE POLICY "Directors can manage certification evidence at their school"
ON public.certification_evidence
FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'director'
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'director'
));

-- School staff can manage certification evidence at their school
CREATE POLICY "School staff can manage certification evidence at their school"
ON public.certification_evidence
FOR ALL
USING (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['school'::app_role, 'school_staff'::app_role])
))
WITH CHECK (school_id IN (
  SELECT user_roles.school_id FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['school'::app_role, 'school_staff'::app_role])
));

-- ============================================================
-- SEED SYSTEM DEFAULT CERTIFICATION TYPES
-- ============================================================

INSERT INTO public.certification_types (name, description, default_validity_months, applies_to, is_system_default, evidence_types, tags) 
VALUES 
  ('CPR Certification', 'Cardiopulmonary Resuscitation certification for staff', 24, 'staff', true, ARRAY['document', 'photo'], ARRAY['safety', 'first-aid']),
  ('First Aid Certification', 'Basic first aid certification', 24, 'staff', true, ARRAY['document', 'photo'], ARRAY['safety', 'first-aid']),
  ('Food Handler''s Permit', 'Food safety and handling certification', 36, 'staff', true, ARRAY['document'], ARRAY['health', 'food-safety']),
  ('Teaching Certificate', 'State teaching credential or license', 60, 'staff', true, ARRAY['document'], ARRAY['credential', 'education']),
  ('CDA Credential', 'Child Development Associate credential', 36, 'staff', true, ARRAY['document'], ARRAY['credential', 'education']),
  ('Background Check Clearance', 'Criminal background check clearance', 12, 'staff', true, ARRAY['document'], ARRAY['safety', 'compliance']),
  ('Fire Extinguisher Inspection', 'Annual fire extinguisher inspection tag', 12, 'facility', true, ARRAY['document', 'photo'], ARRAY['fire-safety', 'inspection']),
  ('Building Permit', 'Certificate of occupancy or building permit', NULL, 'facility', true, ARRAY['document'], ARRAY['building', 'permit']),
  ('Liability Insurance', 'General liability insurance coverage', 12, 'facility', true, ARRAY['document'], ARRAY['insurance', 'compliance']),
  ('Vendor Insurance Certificate', 'Certificate of insurance from vendors', 12, 'vendor', true, ARRAY['document'], ARRAY['insurance', 'vendor'])
ON CONFLICT DO NOTHING;

-- Create updated_at trigger for certification tables
CREATE OR REPLACE FUNCTION public.update_certification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_certification_records_updated_at ON public.certification_records;
CREATE TRIGGER update_certification_records_updated_at
BEFORE UPDATE ON public.certification_records
FOR EACH ROW
EXECUTE FUNCTION public.update_certification_updated_at();

DROP TRIGGER IF EXISTS update_certification_types_updated_at ON public.certification_types;
CREATE TRIGGER update_certification_types_updated_at
BEFORE UPDATE ON public.certification_types
FOR EACH ROW
EXECUTE FUNCTION public.update_certification_updated_at();