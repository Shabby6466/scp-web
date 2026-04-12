-- ============================================================================
-- CONSOLIDATED SCHEMA FOR PRESCHOOL ADMIN PORTAL
-- Generated: 2024-12-29
-- Run this in your standalone Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================

-- Core application roles
CREATE TYPE public.app_role AS ENUM ('parent', 'admin', 'school_staff', 'school', 'director', 'teacher');

-- Document status
CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Document categories
CREATE TYPE public.document_category AS ENUM (
  'immunization_records',
  'health_forms',
  'emergency_contacts',
  'birth_certificate',
  'proof_of_residence',
  'medical_records'
);

-- Auth event types for audit logging
CREATE TYPE public.auth_event_type AS ENUM (
  'sign_up',
  'sign_in', 
  'sign_out',
  'password_reset_request',
  'password_reset_complete',
  'password_change',
  'session_refresh',
  'failed_login'
);

-- Compliance framework enums
CREATE TYPE public.compliance_frequency AS ENUM ('one_time', 'monthly', 'quarterly', 'semiannual', 'annual');
CREATE TYPE public.compliance_status AS ENUM ('not_started', 'in_progress', 'complete', 'overdue', 'not_applicable');
CREATE TYPE public.evidence_type AS ENUM ('document', 'photo', 'log', 'link');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_status AS ENUM ('todo', 'doing', 'done');
CREATE TYPE public.reminder_type AS ENUM ('upcoming', 'overdue');
CREATE TYPE public.reminder_channel AS ENUM ('email', 'in_app');
CREATE TYPE public.inspection_category AS ENUM ('doh', 'facility_safety');

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  school_id UUID,
  branch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Schools table
CREATE TABLE public.schools (
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
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- School branches table
CREATE TABLE public.school_branches (
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

-- Add FK to user_roles for school and branch
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_roles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.school_branches(id) ON DELETE SET NULL;

-- Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.school_branches(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  school_name TEXT,
  grade_level TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table (student documents)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  category document_category NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status document_status NOT NULL DEFAULT 'pending',
  expiration_date DATE,
  notes TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.school_branches(id),
  position_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  hire_date DATE,
  certification_type TEXT,
  certification_expiry DATE,
  background_check_date DATE,
  background_check_expiry DATE,
  employment_status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Teacher documents table
CREATE TABLE public.teacher_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  expiration_date DATE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Teacher positions table
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

-- Add FK for position_id on teachers
ALTER TABLE public.teachers 
  ADD CONSTRAINT teachers_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.teacher_positions(id);

-- Teacher eligibility profiles table
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

-- Parents table (for imported/non-auth parents)
CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Student-parent junction table
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

-- ============================================================================
-- SECTION 3: INVITATION TABLES
-- ============================================================================

-- Parent invitations
CREATE TABLE public.parent_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.school_branches(id) ON DELETE SET NULL,
  parent_email TEXT NOT NULL,
  parent_first_name TEXT,
  parent_last_name TEXT,
  invitation_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Teacher invitations
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

-- Director invitations
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

-- School admin invitations
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

-- ============================================================================
-- SECTION 4: REQUIRED DOCUMENTS TABLES
-- ============================================================================

-- Required documents for students
CREATE TABLE public.required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  applies_to_age_min INTEGER,
  applies_to_age_max INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Required documents for staff
CREATE TABLE public.staff_required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document templates
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT template_ownership CHECK (
    (is_system_template = true AND school_id IS NULL) OR
    (is_system_template = false AND school_id IS NOT NULL)
  )
);

-- ============================================================================
-- SECTION 5: MESSAGING & AUDIT TABLES
-- ============================================================================

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- User consent table
CREATE TABLE public.user_consent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  privacy_policy_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Auth audit logs
CREATE TABLE public.auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  event_type auth_event_type NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- General audit events
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Error logs
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  school_id UUID REFERENCES public.schools(id),
  user_id UUID,
  request_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT
);

-- Platform settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Import jobs for roster imports
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

-- ============================================================================
-- SECTION 6: COMPLIANCE FRAMEWORK TABLES
-- ============================================================================

-- Inspection types (DOH, Fire, Building, etc.)
CREATE TABLE public.inspection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category inspection_category DEFAULT 'facility_safety',
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance requirement templates (system defaults)
CREATE TABLE public.compliance_requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_type_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency public.compliance_frequency NOT NULL DEFAULT 'annual',
  evidence_required BOOLEAN NOT NULL DEFAULT true,
  evidence_types public.evidence_type[] DEFAULT ARRAY['document']::public.evidence_type[],
  suggested_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  risk_level public.risk_level NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance requirements (school-specific)
CREATE TABLE public.compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  inspection_type_id UUID NOT NULL REFERENCES public.inspection_types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  owner_user_id UUID,
  frequency public.compliance_frequency NOT NULL DEFAULT 'annual',
  interval_value INTEGER DEFAULT 1,
  due_date DATE,
  next_due_date DATE,
  status public.compliance_status NOT NULL DEFAULT 'not_started',
  last_completed_at TIMESTAMPTZ,
  requires_review BOOLEAN NOT NULL DEFAULT false,
  evidence_required BOOLEAN NOT NULL DEFAULT true,
  risk_level public.risk_level NOT NULL DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance evidence
CREATE TABLE public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.compliance_requirements(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  evidence_type public.evidence_type NOT NULL,
  document_id UUID,
  file_path TEXT,
  url TEXT,
  note TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance tasks
CREATE TABLE public.compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  due_date DATE,
  status public.task_status NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance reminders log
CREATE TABLE public.compliance_reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE SET NULL,
  reminder_type public.reminder_type NOT NULL,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel public.reminder_channel NOT NULL DEFAULT 'email'
);

-- ============================================================================
-- SECTION 7: CERTIFICATION TABLES
-- ============================================================================

-- Certification types (templates)
CREATE TABLE public.certification_types (
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

-- Certification records
CREATE TABLE public.certification_records (
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

-- Certification evidence
CREATE TABLE public.certification_evidence (
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

-- ============================================================================
-- SECTION 8: INDEXES
-- ============================================================================

-- User roles indexes
CREATE INDEX idx_user_roles_branch_id ON public.user_roles(branch_id);

-- School branches indexes
CREATE INDEX idx_school_branches_school_id ON public.school_branches(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_branches_active ON public.school_branches(is_active) WHERE deleted_at IS NULL;

-- Students indexes
CREATE INDEX idx_students_branch_id ON public.students(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_deleted_at ON public.students(deleted_at) WHERE deleted_at IS NOT NULL;

-- Documents indexes
CREATE INDEX idx_documents_deleted_at ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;

-- Teachers indexes
CREATE INDEX idx_teachers_branch_id ON public.teachers(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teachers_deleted_at ON public.teachers(deleted_at) WHERE deleted_at IS NOT NULL;

-- Teacher documents indexes
CREATE INDEX idx_teacher_documents_deleted_at ON public.teacher_documents(deleted_at) WHERE deleted_at IS NOT NULL;

-- Schools indexes
CREATE INDEX idx_schools_deleted_at ON public.schools(deleted_at) WHERE deleted_at IS NOT NULL;

-- Messages indexes
CREATE INDEX idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Parent invitations indexes
CREATE INDEX idx_parent_invitations_token ON public.parent_invitations(invitation_token);
CREATE INDEX idx_parent_invitations_school_email ON public.parent_invitations(school_id, parent_email);
CREATE INDEX idx_parent_invites_student_id ON public.parent_invitations(student_id);
CREATE INDEX idx_parent_invites_school_branch ON public.parent_invitations(school_id, branch_id);
CREATE UNIQUE INDEX unique_active_invite_per_student ON public.parent_invitations (student_id, parent_email) WHERE status IN ('pending', 'sent') AND student_id IS NOT NULL;

-- Director invitations indexes
CREATE INDEX idx_director_invitations_token ON public.director_invitations(invitation_token);

-- School admin invitations indexes
CREATE INDEX idx_school_admin_invitations_token ON public.school_admin_invitations(invitation_token);
CREATE INDEX idx_school_admin_invitations_school ON public.school_admin_invitations(school_id);

-- Document templates indexes
CREATE INDEX idx_document_templates_category ON public.document_templates(category);
CREATE INDEX idx_document_templates_school ON public.document_templates(school_id);
CREATE INDEX idx_document_templates_system ON public.document_templates(is_system_template);

-- Auth audit logs indexes
CREATE INDEX idx_auth_audit_user_id ON public.auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_created_at ON public.auth_audit_logs(created_at DESC);
CREATE INDEX idx_auth_audit_event_type ON public.auth_audit_logs(event_type);

-- Audit events indexes
CREATE INDEX idx_audit_events_event_type ON public.audit_events(event_type);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_user ON public.audit_events(user_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);

-- Error logs indexes
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity) WHERE resolved_at IS NULL;
CREATE INDEX idx_error_logs_school_id ON public.error_logs(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_error_logs_function_name ON public.error_logs(function_name);

-- Inspection types indexes
CREATE INDEX idx_inspection_types_school ON public.inspection_types(school_id);
CREATE INDEX idx_inspection_types_name ON public.inspection_types(name);
CREATE INDEX idx_inspection_types_category ON public.inspection_types(category);
CREATE INDEX idx_inspection_types_school_category ON public.inspection_types(school_id, category);

-- Compliance requirement templates indexes
CREATE INDEX idx_requirement_templates_type ON public.compliance_requirement_templates(inspection_type_name);

-- Compliance requirements indexes
CREATE INDEX idx_requirements_school ON public.compliance_requirements(school_id);
CREATE INDEX idx_requirements_inspection ON public.compliance_requirements(inspection_type_id);
CREATE INDEX idx_requirements_status ON public.compliance_requirements(status);
CREATE INDEX idx_requirements_due ON public.compliance_requirements(next_due_date);
CREATE INDEX idx_requirements_owner ON public.compliance_requirements(owner_user_id);

-- Compliance evidence indexes
CREATE INDEX idx_evidence_requirement ON public.compliance_evidence(requirement_id);
CREATE INDEX idx_evidence_school ON public.compliance_evidence(school_id);

-- Compliance tasks indexes
CREATE INDEX idx_tasks_school ON public.compliance_tasks(school_id);
CREATE INDEX idx_tasks_assigned ON public.compliance_tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.compliance_tasks(status);

-- Compliance reminders indexes
CREATE INDEX idx_reminders_school ON public.compliance_reminders_log(school_id);
CREATE INDEX idx_reminders_requirement ON public.compliance_reminders_log(requirement_id);

-- Certification indexes
CREATE INDEX idx_certification_records_school ON public.certification_records(school_id);
CREATE INDEX idx_certification_records_status ON public.certification_records(status);
CREATE INDEX idx_certification_records_expiry ON public.certification_records(expiry_date);
CREATE INDEX idx_certification_records_applies_to ON public.certification_records(applies_to);
CREATE INDEX idx_certification_evidence_record ON public.certification_evidence(certification_record_id);
CREATE INDEX idx_certification_evidence_school ON public.certification_evidence(school_id);

-- Parents indexes
CREATE INDEX idx_parents_school_id ON public.parents(school_id);
CREATE INDEX idx_parents_email ON public.parents(email);

-- Student parents indexes
CREATE INDEX idx_student_parents_student_id ON public.student_parents(student_id);
CREATE INDEX idx_student_parents_parent_id ON public.student_parents(parent_id);

-- Import jobs indexes
CREATE INDEX idx_import_jobs_school_id ON public.import_jobs(school_id);

-- ============================================================================
-- SECTION 9: HELPER FUNCTIONS
-- ============================================================================

-- Role checking function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Director branch access function
CREATE OR REPLACE FUNCTION public.director_has_branch_access(p_user_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = p_user_id
    AND user_roles.role = 'director'
    AND (
      user_roles.branch_id IS NULL  -- Directors without branch can see all
      OR user_roles.branch_id = p_branch_id
    )
  )
$$;

-- Parent student access function
CREATE OR REPLACE FUNCTION public.parent_has_student_access(p_user_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_parents sp
    JOIN parents p ON sp.parent_id = p.id
    WHERE p.user_id = p_user_id
    AND sp.student_id = p_student_id
  )
  OR EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id AND s.parent_id = p_user_id
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Handle new user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_teacher_invite RECORD;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Check if this is an institution signup (has institution_name in metadata)
  IF NEW.raw_user_meta_data->>'institution_name' IS NOT NULL THEN
    -- Skip role assignment - they complete school registration first
    NULL;
  -- Check if there's a pending teacher invitation for this email
  ELSIF EXISTS (
    SELECT 1 FROM teacher_invitations 
    WHERE email = NEW.email 
    AND status = 'pending'
  ) THEN
    -- Get the teacher invitation details
    SELECT school_id, branch_id INTO v_pending_teacher_invite
    FROM teacher_invitations
    WHERE email = NEW.email
    AND status = 'pending'
    LIMIT 1;
    
    -- Assign teacher role with school_id and branch_id
    INSERT INTO public.user_roles (user_id, role, school_id, branch_id)
    VALUES (NEW.id, 'teacher', v_pending_teacher_invite.school_id, v_pending_teacher_invite.branch_id);
  ELSE
    -- Assign parent role by default for regular signups
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Prevent privilege escalation trigger function
CREATE OR REPLACE FUNCTION public.prevent_parent_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('admin', 'school', 'school_staff', 'director') THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.user_id AND role = 'parent'
    ) THEN
      RAISE EXCEPTION 'Cannot assign system role to existing parent account';
    END IF;
  END IF;
  
  IF NEW.role = 'parent' THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.user_id 
      AND role IN ('admin', 'school', 'school_staff', 'director')
    ) THEN
      RAISE EXCEPTION 'Cannot assign parent role to system user account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Calculate next due date function
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  p_last_completed TIMESTAMPTZ,
  p_frequency public.compliance_frequency,
  p_interval_value INTEGER DEFAULT 1
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_last_completed IS NULL THEN
    RETURN NULL;
  END IF;
  
  CASE p_frequency
    WHEN 'one_time' THEN
      RETURN NULL;
    WHEN 'monthly' THEN
      RETURN (p_last_completed + (p_interval_value || ' months')::INTERVAL)::DATE;
    WHEN 'quarterly' THEN
      RETURN (p_last_completed + (p_interval_value * 3 || ' months')::INTERVAL)::DATE;
    WHEN 'semiannual' THEN
      RETURN (p_last_completed + (p_interval_value * 6 || ' months')::INTERVAL)::DATE;
    WHEN 'annual' THEN
      RETURN (p_last_completed + (p_interval_value || ' years')::INTERVAL)::DATE;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;

-- Validate invitation functions
CREATE OR REPLACE FUNCTION public.validate_teacher_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  school_id uuid,
  branch_id uuid,
  classroom text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.first_name,
    ti.last_name,
    ti.school_id,
    ti.branch_id,
    ti.classroom,
    true as is_valid
  FROM teacher_invitations ti
  WHERE ti.invitation_token = p_token
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_school_admin_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  admin_email text,
  admin_name text,
  school_id uuid,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sai.id,
    sai.admin_email,
    sai.admin_name,
    sai.school_id,
    true as is_valid
  FROM school_admin_invitations sai
  WHERE sai.invitation_token = p_token
    AND sai.status = 'pending'
    AND sai.expires_at > now();
END;
$$;

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

CREATE OR REPLACE FUNCTION validate_parent_invitation(p_token TEXT)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  school_id UUID,
  branch_id UUID,
  parent_email TEXT,
  parent_first_name TEXT,
  parent_last_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.student_id,
    pi.school_id,
    pi.branch_id,
    pi.parent_email,
    pi.parent_first_name,
    pi.parent_last_name,
    true as is_valid
  FROM parent_invitations pi
  WHERE pi.invitation_token = p_token
    AND pi.status IN ('pending', 'sent')
    AND pi.expires_at > now();
END;
$$;

-- ============================================================================
-- SECTION 10: TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_branches_updated_at BEFORE UPDATE ON public.school_branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_documents_updated_at BEFORE UPDATE ON public.teacher_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_required_documents_updated_at BEFORE UPDATE ON public.staff_required_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_consent_updated_at BEFORE UPDATE ON public.user_consent FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspection_types_updated_at BEFORE UPDATE ON public.inspection_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.compliance_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.compliance_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_positions_updated_at BEFORE UPDATE ON public.teacher_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_eligibility_profiles_updated_at BEFORE UPDATE ON public.teacher_eligibility_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User signup trigger
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role separation trigger
CREATE TRIGGER enforce_role_separation BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.prevent_parent_privilege_escalation();

-- Certification updated_at triggers
CREATE OR REPLACE FUNCTION public.update_certification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_certification_records_updated_at BEFORE UPDATE ON public.certification_records FOR EACH ROW EXECUTE FUNCTION public.update_certification_updated_at();
CREATE TRIGGER update_certification_types_updated_at BEFORE UPDATE ON public.certification_types FOR EACH ROW EXECUTE FUNCTION public.update_certification_updated_at();

-- ============================================================================
-- SECTION 11: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_eligibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.required_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_required_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reminders_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_evidence ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 12: ROW LEVEL SECURITY POLICIES
-- Due to size, this includes representative policies. 
-- Full policies are in the individual migration files.
-- ============================================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Directors can view profiles at their school" ON public.profiles FOR SELECT USING (id IN (SELECT DISTINCT parent_id FROM students WHERE school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director')));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can register as school role" ON public.user_roles AS PERMISSIVE FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'school'::app_role);

-- Schools policies
CREATE POLICY "Admins can view all schools" ON public.schools FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all schools" ON public.schools FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "School staff can view their own school" ON public.schools FOR SELECT USING (id IN (SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role)) AND deleted_at IS NULL);
CREATE POLICY "School staff can update their own school" ON public.schools FOR UPDATE USING (id IN (SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role)) AND deleted_at IS NULL);
CREATE POLICY "Directors can view their school" ON public.schools FOR SELECT USING (id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director') AND deleted_at IS NULL);
CREATE POLICY "Allow authenticated school registration" ON public.schools FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- School branches policies
CREATE POLICY "Admins can view all school branches" ON public.school_branches FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert school branches" ON public.school_branches FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update school branches" ON public.school_branches FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "School staff can view their school branches" ON public.school_branches FOR SELECT USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school'::app_role, 'school_staff'::app_role)) AND deleted_at IS NULL);
CREATE POLICY "School staff can insert their school branches" ON public.school_branches FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school'::app_role, 'school_staff'::app_role)));
CREATE POLICY "School staff can update their school branches" ON public.school_branches FOR UPDATE USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school'::app_role, 'school_staff'::app_role)) AND deleted_at IS NULL);
CREATE POLICY "Directors can view branches at their school" ON public.school_branches FOR SELECT USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'::app_role) AND deleted_at IS NULL);
CREATE POLICY "Directors can insert branches at their school" ON public.school_branches FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'::app_role));
CREATE POLICY "Directors can update branches at their school" ON public.school_branches FOR UPDATE USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'::app_role) AND deleted_at IS NULL);

-- Students policies
CREATE POLICY "Parents can view linked students" ON public.students FOR SELECT USING (deleted_at IS NULL AND (auth.uid() = parent_id OR parent_has_student_access(auth.uid(), id)));
CREATE POLICY "Parents can insert their own students" ON public.students FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update their own students" ON public.students FOR UPDATE USING (auth.uid() = parent_id AND deleted_at IS NULL);
CREATE POLICY "School staff can view students at their school" ON public.students FOR SELECT USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'school_staff'::app_role) OR auth.uid() = parent_id OR school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND (role = 'school'::app_role OR role = 'school_staff'::app_role))) AND deleted_at IS NULL);
CREATE POLICY "Directors can view students in their branch" ON public.students FOR SELECT USING (deleted_at IS NULL AND school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = students.school_id AND ur.branch_id IS NULL) OR director_has_branch_access(auth.uid(), branch_id)));

-- Documents policies  
CREATE POLICY "Parents can view their own documents" ON public.documents FOR SELECT USING (auth.uid() = parent_id AND deleted_at IS NULL);
CREATE POLICY "Parents can view linked student documents" ON public.documents FOR SELECT USING (deleted_at IS NULL AND (auth.uid() = parent_id OR parent_has_student_access(auth.uid(), student_id)));
CREATE POLICY "Parents can create linked student documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = parent_id AND parent_has_student_access(auth.uid(), student_id));
CREATE POLICY "Parents can update their own documents" ON public.documents FOR UPDATE USING (auth.uid() = parent_id AND status = 'pending'::document_status AND deleted_at IS NULL);
CREATE POLICY "School staff can view documents at their school" ON public.documents FOR SELECT USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'school_staff'::app_role) OR auth.uid() = parent_id OR school_id IN (SELECT user_roles.school_id FROM user_roles WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role))) AND deleted_at IS NULL);
CREATE POLICY "Directors can view documents in their branch" ON public.documents FOR SELECT USING (deleted_at IS NULL AND school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = documents.school_id AND ur.branch_id IS NULL) OR EXISTS (SELECT 1 FROM students s WHERE s.id = documents.student_id AND director_has_branch_access(auth.uid(), s.branch_id))));
CREATE POLICY "Directors can update documents in their branch" ON public.documents FOR UPDATE USING (deleted_at IS NULL AND school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = documents.school_id AND ur.branch_id IS NULL) OR EXISTS (SELECT 1 FROM students s WHERE s.id = documents.student_id AND director_has_branch_access(auth.uid(), s.branch_id))));

-- Teachers policies
CREATE POLICY "Admins can select all teachers" ON public.teachers FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert teachers" ON public.teachers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update teachers" ON public.teachers FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "School staff can select their school teachers" ON public.teachers FOR SELECT USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')) AND deleted_at IS NULL);
CREATE POLICY "School staff can insert their school teachers" ON public.teachers FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "School staff can update their school teachers" ON public.teachers FOR UPDATE USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')) AND deleted_at IS NULL) WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "Directors can view teachers in their branch" ON public.teachers FOR SELECT USING (deleted_at IS NULL AND school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = teachers.school_id AND ur.branch_id IS NULL) OR director_has_branch_access(auth.uid(), branch_id)));
CREATE POLICY "Directors can insert teachers in their branch" ON public.teachers FOR INSERT WITH CHECK (school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = teachers.school_id AND ur.branch_id IS NULL) OR director_has_branch_access(auth.uid(), branch_id)));
CREATE POLICY "Directors can update teachers in their branch" ON public.teachers FOR UPDATE USING (deleted_at IS NULL AND school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = teachers.school_id AND ur.branch_id IS NULL) OR director_has_branch_access(auth.uid(), branch_id))) WITH CHECK (school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director'));
CREATE POLICY "Teachers can view their own record" ON public.teachers FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'teacher' AND ur.school_id = teachers.school_id) AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Teacher documents policies
CREATE POLICY "Admins can select all teacher docs" ON public.teacher_documents FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert teacher docs" ON public.teacher_documents FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update teacher docs" ON public.teacher_documents FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "School staff can select their school teacher docs" ON public.teacher_documents FOR SELECT USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')) AND deleted_at IS NULL);
CREATE POLICY "School staff can insert their school teacher docs" ON public.teacher_documents FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "School staff can update their school teacher docs" ON public.teacher_documents FOR UPDATE USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')) AND deleted_at IS NULL) WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "Directors can view teacher docs in their branch" ON public.teacher_documents FOR SELECT USING (deleted_at IS NULL AND school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = teacher_documents.school_id AND ur.branch_id IS NULL) OR EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_documents.teacher_id AND director_has_branch_access(auth.uid(), t.branch_id))));
CREATE POLICY "Directors can insert teacher docs in their branch" ON public.teacher_documents FOR INSERT WITH CHECK (school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = teacher_documents.school_id AND ur.branch_id IS NULL) OR EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_documents.teacher_id AND director_has_branch_access(auth.uid(), t.branch_id))));
CREATE POLICY "Directors can update teacher docs in their branch" ON public.teacher_documents FOR UPDATE USING (school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director') AND (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'director' AND ur.school_id = teacher_documents.school_id AND ur.branch_id IS NULL) OR EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_documents.teacher_id AND director_has_branch_access(auth.uid(), t.branch_id))));
CREATE POLICY "Teachers can view their own documents" ON public.teacher_documents FOR SELECT USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_documents.teacher_id AND t.email = (SELECT email FROM auth.users WHERE id = auth.uid())) AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'teacher' AND ur.school_id = teacher_documents.school_id));

-- Audit events policies
CREATE POLICY "Admins can view all audit events" ON public.audit_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Directors can view audit events for their school" ON public.audit_events FOR SELECT USING (metadata->>'school_id' IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));
CREATE POLICY "Service role can insert audit events" ON public.audit_events FOR INSERT WITH CHECK (true);

-- Auth audit logs policies
CREATE POLICY "Admins can view all audit logs" ON public.auth_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert audit logs" ON public.auth_audit_logs FOR INSERT WITH CHECK (true);

-- Error logs policies
CREATE POLICY "Admins can view all error logs" ON public.error_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "School admins can view their school error logs" ON public.error_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.school_id = error_logs.school_id AND user_roles.role IN ('school', 'school_staff')));
CREATE POLICY "Service role can insert error logs" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update error logs" ON public.error_logs FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Platform settings policies
CREATE POLICY "Admins can read all settings" ON public.platform_settings FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.platform_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.platform_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete settings" ON public.platform_settings FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Messages policies
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING ((auth.uid() = sender_id OR auth.uid() = recipient_id OR (is_broadcast = true AND school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid()))) AND deleted_at IS NULL);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients can mark messages as read" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Directors can view messages at their school" ON public.messages FOR SELECT USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director') AND deleted_at IS NULL);
CREATE POLICY "Directors can send messages at their school" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));

-- User consent policies
CREATE POLICY "Users can view their own consent" ON public.user_consent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own consent" ON public.user_consent FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own consent" ON public.user_consent FOR UPDATE USING (auth.uid() = user_id);

-- (Additional policies for other tables follow similar patterns - see individual migration files for complete list)

-- ============================================================================
-- SECTION 13: STORAGE BUCKETS
-- ============================================================================

-- Documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Teacher documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teacher-documents',
  'teacher-documents',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Document templates bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-templates',
  'document-templates',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/jpeg', 'image/png']
);

-- Staff resumes bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-resumes',
  'staff-resumes',
  false,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- ============================================================================
-- SECTION 14: STORAGE POLICIES
-- ============================================================================

-- Documents bucket policies
CREATE POLICY "doc_admin_view" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "doc_staff_view" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[2] IN (SELECT s.id::text FROM students s INNER JOIN user_roles ur ON ur.school_id = s.school_id WHERE ur.user_id = auth.uid() AND ur.role IN ('school', 'school_staff', 'director')));
CREATE POLICY "doc_parent_view" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] IN (SELECT sp.student_id::text FROM student_parents sp JOIN parents p ON sp.parent_id = p.id WHERE p.user_id = auth.uid())));
CREATE POLICY "doc_parent_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "doc_staff_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[2] IN (SELECT s.id::text FROM students s INNER JOIN user_roles ur ON ur.school_id = s.school_id WHERE ur.user_id = auth.uid() AND ur.role IN ('school', 'school_staff', 'director'))));
CREATE POLICY "doc_delete" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = auth.uid()::text));

-- Teacher documents bucket policies
CREATE POLICY "teacher_doc_admin_view" ON storage.objects FOR SELECT USING (bucket_id = 'teacher-documents' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "teacher_doc_staff_view" ON storage.objects FOR SELECT USING (bucket_id = 'teacher-documents' AND (storage.foldername(name))[1] IN (SELECT ur.school_id::text FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('school', 'school_staff', 'director')));
CREATE POLICY "teacher_doc_staff_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'teacher-documents' AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] IN (SELECT ur.school_id::text FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('school', 'school_staff', 'director'))));
CREATE POLICY "teacher_doc_delete" ON storage.objects FOR DELETE USING (bucket_id = 'teacher-documents' AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] IN (SELECT ur.school_id::text FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('school', 'school_staff', 'director'))));

-- Document templates bucket policies
CREATE POLICY "Authenticated users can view templates" ON storage.objects FOR SELECT USING (bucket_id = 'document-templates');
CREATE POLICY "School staff can upload template files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'document-templates' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'school_staff'::app_role) OR has_role(auth.uid(), 'school'::app_role)));
CREATE POLICY "School staff can update template files" ON storage.objects FOR UPDATE USING (bucket_id = 'document-templates' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'school_staff'::app_role) OR has_role(auth.uid(), 'school'::app_role)));
CREATE POLICY "School staff can delete template files" ON storage.objects FOR DELETE USING (bucket_id = 'document-templates' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'school_staff'::app_role) OR has_role(auth.uid(), 'school'::app_role)));
CREATE POLICY "Admins can manage template files" ON storage.objects FOR ALL USING (bucket_id = 'document-templates' AND has_role(auth.uid(), 'admin'));

-- Staff resumes bucket policies
CREATE POLICY "School staff can upload resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "School staff can view resumes" ON storage.objects FOR SELECT USING (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "School staff can update resumes" ON storage.objects FOR UPDATE USING (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "School staff can delete resumes" ON storage.objects FOR DELETE USING (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));
CREATE POLICY "Directors can upload resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));
CREATE POLICY "Directors can view resumes" ON storage.objects FOR SELECT USING (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));
CREATE POLICY "Directors can update resumes" ON storage.objects FOR UPDATE USING (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));
CREATE POLICY "Directors can delete resumes" ON storage.objects FOR DELETE USING (bucket_id = 'staff-resumes' AND (storage.foldername(name))[1] IN (SELECT school_id::text FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));
CREATE POLICY "Admins can manage all resumes" ON storage.objects FOR ALL USING (bucket_id = 'staff-resumes' AND has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'staff-resumes' AND has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SECTION 15: SEED DATA
-- ============================================================================

-- Platform settings defaults
INSERT INTO public.platform_settings (key, value, description) VALUES
('general', '{"maintenanceMode": false, "platformName": "SCP"}', 'General platform settings'),
('registration', '{"allowSchoolSelfRegistration": true, "allowParentSelfRegistration": true, "autoConfirmEmails": true, "requireSchoolApproval": true}', 'Registration and approval settings'),
('notifications', '{"emailNotificationsEnabled": true, "sendWelcomeEmails": true, "sendExpirationReminders": true, "reminderDaysBeforeExpiry": 30}', 'Notification settings'),
('security', '{"sessionTimeout": 60, "maxLoginAttempts": 5}', 'Security settings');

-- Default certification types
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

-- ============================================================================
-- END OF CONSOLIDATED SCHEMA
-- ============================================================================
