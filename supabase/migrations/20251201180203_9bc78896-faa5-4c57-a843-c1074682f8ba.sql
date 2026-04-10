-- =============================================
-- 1. AUTHENTICATION AUDIT LOG SYSTEM
-- =============================================

-- Create enum for audit event types
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

-- Create audit log table
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

-- Enable RLS
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.auth_audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs (via edge function)
CREATE POLICY "Service role can insert audit logs"
ON public.auth_audit_logs FOR INSERT
WITH CHECK (true);

-- Add indexes for efficient querying
CREATE INDEX idx_auth_audit_user_id ON public.auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_created_at ON public.auth_audit_logs(created_at DESC);
CREATE INDEX idx_auth_audit_event_type ON public.auth_audit_logs(event_type);

-- =============================================
-- 2. SOFT DELETE FOR COMPLIANCE
-- =============================================

-- Add deleted_at and deleted_by columns to critical tables
ALTER TABLE public.documents 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

ALTER TABLE public.students 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

ALTER TABLE public.teachers 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

ALTER TABLE public.teacher_documents 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

ALTER TABLE public.schools 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

ALTER TABLE public.messages 
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

-- Add indexes for soft delete queries
CREATE INDEX idx_documents_deleted_at ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_students_deleted_at ON public.students(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_teachers_deleted_at ON public.teachers(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_teacher_documents_deleted_at ON public.teacher_documents(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_schools_deleted_at ON public.schools(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- =============================================
-- 3. UPDATE RLS POLICIES FOR SOFT DELETE
-- =============================================

-- DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Parents can view their own documents" ON public.documents;
CREATE POLICY "Parents can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = parent_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Parents can update their own documents" ON public.documents;
CREATE POLICY "Parents can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = parent_id AND status = 'pending'::document_status AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Parents can create documents for their students" ON public.documents;
CREATE POLICY "Parents can create documents for their students"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "School staff can view documents at their school" ON public.documents;
CREATE POLICY "School staff can view documents at their school"
ON public.documents FOR SELECT
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'school_staff'::app_role) OR 
   auth.uid() = parent_id OR 
   school_id IN (
     SELECT user_roles.school_id FROM user_roles 
     WHERE user_roles.user_id = auth.uid() 
     AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
   ))
  AND deleted_at IS NULL
);

-- STUDENTS POLICIES
DROP POLICY IF EXISTS "Parents can view their own students" ON public.students;
CREATE POLICY "Parents can view their own students"
ON public.students FOR SELECT
USING (auth.uid() = parent_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Parents can update their own students" ON public.students;
CREATE POLICY "Parents can update their own students"
ON public.students FOR UPDATE
USING (auth.uid() = parent_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "School staff can view students at their school" ON public.students;
CREATE POLICY "School staff can view students at their school"
ON public.students FOR SELECT
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'school_staff'::app_role) OR 
   auth.uid() = parent_id OR 
   school_id IN (
     SELECT user_roles.school_id FROM user_roles 
     WHERE user_roles.user_id = auth.uid() 
     AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
   ))
  AND deleted_at IS NULL
);

-- TEACHERS POLICIES
DROP POLICY IF EXISTS "School staff can view their school teachers" ON public.teachers;
CREATE POLICY "School staff can view their school teachers"
ON public.teachers FOR SELECT
USING (
  school_id IN (
    SELECT user_roles.school_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "School staff can manage their school teachers" ON public.teachers;
CREATE POLICY "School staff can manage their school teachers"
ON public.teachers FOR ALL
USING (
  school_id IN (
    SELECT user_roles.school_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

-- TEACHER DOCUMENTS POLICIES
DROP POLICY IF EXISTS "School staff can view their school teacher documents" ON public.teacher_documents;
CREATE POLICY "School staff can view their school teacher documents"
ON public.teacher_documents FOR SELECT
USING (
  school_id IN (
    SELECT user_roles.school_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "School staff can manage their school teacher documents" ON public.teacher_documents;
CREATE POLICY "School staff can manage their school teacher documents"
ON public.teacher_documents FOR ALL
USING (
  school_id IN (
    SELECT user_roles.school_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

-- SCHOOLS POLICIES
DROP POLICY IF EXISTS "School staff can view their own school" ON public.schools;
CREATE POLICY "School staff can view their own school"
ON public.schools FOR SELECT
USING (
  id IN (
    SELECT user_roles.school_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS "School staff can update their own school" ON public.schools;
CREATE POLICY "School staff can update their own school"
ON public.schools FOR UPDATE
USING (
  id IN (
    SELECT user_roles.school_id FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND (user_roles.role = 'school'::app_role OR user_roles.role = 'school_staff'::app_role)
  )
  AND deleted_at IS NULL
);

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
  (auth.uid() = sender_id OR auth.uid() = recipient_id OR 
   (is_broadcast = true AND school_id IN (
     SELECT user_roles.school_id FROM user_roles WHERE user_roles.user_id = auth.uid()
   )))
  AND deleted_at IS NULL
);

-- =============================================
-- 4. UPDATE DATABASE FUNCTIONS FOR SOFT DELETE
-- =============================================

-- Update get_expiring_documents to exclude soft-deleted records
CREATE OR REPLACE FUNCTION public.get_expiring_documents(days_threshold integer DEFAULT 60)
RETURNS TABLE(id uuid, document_type text, entity_type text, entity_id uuid, entity_name text, school_id uuid, school_name text, expiration_date date, days_until_expiry integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.category::TEXT as document_type,
    'student'::TEXT as entity_type,
    s.id as entity_id,
    (s.first_name || ' ' || s.last_name) as entity_name,
    s.school_id,
    sc.name as school_name,
    d.expiration_date::DATE,
    (d.expiration_date::DATE - CURRENT_DATE)::INTEGER as days_until_expiry
  FROM documents d
  JOIN students s ON d.student_id = s.id
  LEFT JOIN schools sc ON s.school_id = sc.id
  WHERE d.expiration_date IS NOT NULL
    AND d.expiration_date::DATE <= (CURRENT_DATE + days_threshold)
    AND d.expiration_date::DATE >= CURRENT_DATE
    AND d.status != 'expired'
    AND d.deleted_at IS NULL
    AND s.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    td.id,
    td.document_type,
    'teacher'::TEXT as entity_type,
    t.id as entity_id,
    (t.first_name || ' ' || t.last_name) as entity_name,
    t.school_id,
    sc.name as school_name,
    td.expiration_date::DATE,
    (td.expiration_date::DATE - CURRENT_DATE)::INTEGER as days_until_expiry
  FROM teacher_documents td
  JOIN teachers t ON td.teacher_id = t.id
  LEFT JOIN schools sc ON t.school_id = sc.id
  WHERE td.expiration_date IS NOT NULL
    AND td.expiration_date::DATE <= (CURRENT_DATE + days_threshold)
    AND td.expiration_date::DATE >= CURRENT_DATE
    AND td.deleted_at IS NULL
    AND t.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    t.id,
    'certification'::TEXT as document_type,
    'teacher'::TEXT as entity_type,
    t.id as entity_id,
    (t.first_name || ' ' || t.last_name) as entity_name,
    t.school_id,
    sc.name as school_name,
    t.certification_expiry::DATE as expiration_date,
    (t.certification_expiry::DATE - CURRENT_DATE)::INTEGER as days_until_expiry
  FROM teachers t
  LEFT JOIN schools sc ON t.school_id = sc.id
  WHERE t.certification_expiry IS NOT NULL
    AND t.certification_expiry::DATE <= (CURRENT_DATE + days_threshold)
    AND t.certification_expiry::DATE >= CURRENT_DATE
    AND t.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    t.id,
    'background_check'::TEXT as document_type,
    'teacher'::TEXT as entity_type,
    t.id as entity_id,
    (t.first_name || ' ' || t.last_name) as entity_name,
    t.school_id,
    sc.name as school_name,
    t.background_check_expiry::DATE as expiration_date,
    (t.background_check_expiry::DATE - CURRENT_DATE)::INTEGER as days_until_expiry
  FROM teachers t
  LEFT JOIN schools sc ON t.school_id = sc.id
  WHERE t.background_check_expiry IS NOT NULL
    AND t.background_check_expiry::DATE <= (CURRENT_DATE + days_threshold)
    AND t.background_check_expiry::DATE >= CURRENT_DATE
    AND t.deleted_at IS NULL
  
  ORDER BY days_until_expiry ASC;
END;
$$;

-- Update get_expired_documents to exclude soft-deleted records
CREATE OR REPLACE FUNCTION public.get_expired_documents()
RETURNS TABLE(id uuid, document_type text, entity_type text, entity_id uuid, entity_name text, school_id uuid, school_name text, expiration_date date, days_expired integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.category::TEXT as document_type,
    'student'::TEXT as entity_type,
    s.id as entity_id,
    (s.first_name || ' ' || s.last_name) as entity_name,
    s.school_id,
    sc.name as school_name,
    d.expiration_date::DATE,
    (CURRENT_DATE - d.expiration_date::DATE)::INTEGER as days_expired
  FROM documents d
  JOIN students s ON d.student_id = s.id
  LEFT JOIN schools sc ON s.school_id = sc.id
  WHERE d.expiration_date IS NOT NULL
    AND d.expiration_date::DATE < CURRENT_DATE
    AND d.deleted_at IS NULL
    AND s.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    td.id,
    td.document_type,
    'teacher'::TEXT as entity_type,
    t.id as entity_id,
    (t.first_name || ' ' || t.last_name) as entity_name,
    t.school_id,
    sc.name as school_name,
    td.expiration_date::DATE,
    (CURRENT_DATE - td.expiration_date::DATE)::INTEGER as days_expired
  FROM teacher_documents td
  JOIN teachers t ON td.teacher_id = t.id
  LEFT JOIN schools sc ON t.school_id = sc.id
  WHERE td.expiration_date IS NOT NULL
    AND td.expiration_date::DATE < CURRENT_DATE
    AND td.deleted_at IS NULL
    AND t.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    t.id,
    'certification'::TEXT as document_type,
    'teacher'::TEXT as entity_type,
    t.id as entity_id,
    (t.first_name || ' ' || t.last_name) as entity_name,
    t.school_id,
    sc.name as school_name,
    t.certification_expiry::DATE as expiration_date,
    (CURRENT_DATE - t.certification_expiry::DATE)::INTEGER as days_expired
  FROM teachers t
  LEFT JOIN schools sc ON t.school_id = sc.id
  WHERE t.certification_expiry IS NOT NULL
    AND t.certification_expiry::DATE < CURRENT_DATE
    AND t.deleted_at IS NULL
  
  UNION ALL
  
  SELECT 
    t.id,
    'background_check'::TEXT as document_type,
    'teacher'::TEXT as entity_type,
    t.id as entity_id,
    (t.first_name || ' ' || t.last_name) as entity_name,
    t.school_id,
    sc.name as school_name,
    t.background_check_expiry::DATE as expiration_date,
    (CURRENT_DATE - t.background_check_expiry::DATE)::INTEGER as days_expired
  FROM teachers t
  LEFT JOIN schools sc ON t.school_id = sc.id
  WHERE t.background_check_expiry IS NOT NULL
    AND t.background_check_expiry::DATE < CURRENT_DATE
    AND t.deleted_at IS NULL
  
  ORDER BY days_expired DESC;
END;
$$;

-- Update get_compliance_stats to exclude soft-deleted records
CREATE OR REPLACE FUNCTION public.get_compliance_stats(p_school_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(total_students integer, compliant_students integer, student_compliance_rate numeric, total_teachers integer, compliant_teachers integer, teacher_compliance_rate numeric, total_expiring_soon integer, total_expired integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_students INTEGER;
  v_compliant_students INTEGER;
  v_total_teachers INTEGER;
  v_compliant_teachers INTEGER;
  v_expiring_soon INTEGER;
  v_expired INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_students
  FROM students s
  WHERE (p_school_id IS NULL OR s.school_id = p_school_id)
    AND s.deleted_at IS NULL;
  
  SELECT COUNT(DISTINCT s.id) INTO v_compliant_students
  FROM students s
  WHERE (p_school_id IS NULL OR s.school_id = p_school_id)
    AND s.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM documents d
      WHERE d.student_id = s.id
        AND d.deleted_at IS NULL
        AND (d.status = 'expired' OR (d.expiration_date IS NOT NULL AND d.expiration_date < CURRENT_DATE))
    );
  
  SELECT COUNT(*) INTO v_total_teachers
  FROM teachers t
  WHERE (p_school_id IS NULL OR t.school_id = p_school_id)
    AND t.employment_status = 'active'
    AND t.deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_compliant_teachers
  FROM teachers t
  WHERE (p_school_id IS NULL OR t.school_id = p_school_id)
    AND t.employment_status = 'active'
    AND t.deleted_at IS NULL
    AND (t.certification_expiry IS NULL OR t.certification_expiry >= CURRENT_DATE)
    AND (t.background_check_expiry IS NULL OR t.background_check_expiry >= CURRENT_DATE);
  
  SELECT COUNT(*) INTO v_expiring_soon
  FROM get_expiring_documents(60) e
  WHERE (p_school_id IS NULL OR e.school_id = p_school_id);
  
  SELECT COUNT(*) INTO v_expired
  FROM get_expired_documents() e
  WHERE (p_school_id IS NULL OR e.school_id = p_school_id);
  
  RETURN QUERY SELECT
    v_total_students,
    v_compliant_students,
    CASE WHEN v_total_students > 0 
      THEN ROUND((v_compliant_students::NUMERIC / v_total_students) * 100, 1)
      ELSE 100 END,
    v_total_teachers,
    v_compliant_teachers,
    CASE WHEN v_total_teachers > 0 
      THEN ROUND((v_compliant_teachers::NUMERIC / v_total_teachers) * 100, 1)
      ELSE 100 END,
    v_expiring_soon,
    v_expired;
END;
$$;