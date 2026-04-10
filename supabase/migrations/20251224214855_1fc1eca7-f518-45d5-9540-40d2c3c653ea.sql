-- =============================================================================
-- SECURITY FIX: Address 3 critical security vulnerabilities
-- =============================================================================

-- =============================================================================
-- FIX 1: Storage Buckets - Add Server-Side File Validation (MIME types + size limits)
-- =============================================================================

UPDATE storage.buckets
SET 
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'documents';

UPDATE storage.buckets
SET 
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'teacher-documents';

-- =============================================================================
-- FIX 2: Storage Policies - Drop ALL existing then recreate with school scope
-- =============================================================================

-- Drop ALL existing storage policies for documents bucket
DROP POLICY IF EXISTS "Admins and staff can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Parents can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Parents can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "School staff can view their school documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload documents for their school" ON storage.objects;
DROP POLICY IF EXISTS "Admins and owners can delete documents" ON storage.objects;

-- Drop ALL existing storage policies for teacher-documents bucket
DROP POLICY IF EXISTS "Admins can view all teacher documents" ON storage.objects;
DROP POLICY IF EXISTS "School staff can view their teachers documents" ON storage.objects;
DROP POLICY IF EXISTS "School staff can upload teacher documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and staff can manage teacher documents" ON storage.objects;
DROP POLICY IF EXISTS "School staff can view their school teacher documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and school owners can delete teacher documents" ON storage.objects;

-- =============================================================================
-- Documents bucket policies (school-scoped)
-- =============================================================================

CREATE POLICY "doc_admin_view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "doc_staff_view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[2] IN (
      SELECT s.id::text FROM students s
      INNER JOIN user_roles ur ON ur.school_id = s.school_id
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('school', 'school_staff', 'director')
    )
  );

CREATE POLICY "doc_parent_view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      (storage.foldername(name))[2] IN (
        SELECT sp.student_id::text FROM student_parents sp
        JOIN parents p ON sp.parent_id = p.id
        WHERE p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "doc_parent_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "doc_staff_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (
      public.has_role(auth.uid(), 'admin') OR
      (storage.foldername(name))[2] IN (
        SELECT s.id::text FROM students s
        INNER JOIN user_roles ur ON ur.school_id = s.school_id
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('school', 'school_staff', 'director')
      )
    )
  );

CREATE POLICY "doc_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (
      public.has_role(auth.uid(), 'admin') OR
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- =============================================================================
-- Teacher-documents bucket policies (school-scoped)
-- =============================================================================

CREATE POLICY "teacher_doc_admin_view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'teacher-documents' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "teacher_doc_staff_view"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'teacher-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT ur.school_id::text FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('school', 'school_staff', 'director')
    )
  );

CREATE POLICY "teacher_doc_staff_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'teacher-documents' AND
    (
      public.has_role(auth.uid(), 'admin') OR
      (storage.foldername(name))[1] IN (
        SELECT ur.school_id::text FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('school', 'school_staff', 'director')
      )
    )
  );

CREATE POLICY "teacher_doc_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'teacher-documents' AND
    (
      public.has_role(auth.uid(), 'admin') OR
      (storage.foldername(name))[1] IN (
        SELECT ur.school_id::text FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('school', 'school_staff', 'director')
      )
    )
  );

-- =============================================================================
-- FIX 3: RPC Functions - Add School Access Validation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_inspection_compliance_stats(p_school_id UUID)
RETURNS TABLE(
  inspection_type_id UUID,
  inspection_name TEXT,
  total_requirements INTEGER,
  completed_count INTEGER,
  overdue_count INTEGER,
  due_30_days INTEGER,
  due_60_days INTEGER,
  due_90_days INTEGER,
  readiness_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND school_id = p_school_id
        AND role IN ('school', 'school_staff', 'director')
    )
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied to school data';
  END IF;

  RETURN QUERY
  SELECT 
    it.id as inspection_type_id,
    it.name as inspection_name,
    COUNT(cr.id)::INTEGER as total_requirements,
    COUNT(CASE WHEN cr.status = 'complete' THEN 1 END)::INTEGER as completed_count,
    COUNT(CASE WHEN cr.status = 'overdue' OR (cr.next_due_date IS NOT NULL AND cr.next_due_date < CURRENT_DATE AND cr.status != 'complete') THEN 1 END)::INTEGER as overdue_count,
    COUNT(CASE WHEN cr.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 THEN 1 END)::INTEGER as due_30_days,
    COUNT(CASE WHEN cr.next_due_date BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60 THEN 1 END)::INTEGER as due_60_days,
    COUNT(CASE WHEN cr.next_due_date BETWEEN CURRENT_DATE + 61 AND CURRENT_DATE + 90 THEN 1 END)::INTEGER as due_90_days,
    CASE 
      WHEN COUNT(cr.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN cr.status = 'complete' OR cr.status = 'not_applicable' THEN 1 END)::NUMERIC / COUNT(cr.id)) * 100, 1)
      ELSE 100 
    END as readiness_score
  FROM inspection_types it
  LEFT JOIN compliance_requirements cr ON cr.inspection_type_id = it.id
  WHERE it.school_id = p_school_id
  GROUP BY it.id, it.name
  ORDER BY it.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expiring_documents(
  p_school_id UUID DEFAULT NULL,
  days_threshold INTEGER DEFAULT 60
)
RETURNS TABLE(
  id UUID,
  document_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  school_id UUID,
  school_name TEXT,
  expiration_date DATE,
  days_until_expiry INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  IF p_school_id IS NOT NULL THEN
    SELECT (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND user_roles.school_id = p_school_id
          AND role IN ('school', 'school_staff', 'director', 'parent')
      )
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RAISE EXCEPTION 'Access denied to school data';
    END IF;
  ELSE
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Access denied - admin role required for all-school view';
    END IF;
  END IF;

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
    AND (p_school_id IS NULL OR s.school_id = p_school_id)
  
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
    AND (p_school_id IS NULL OR t.school_id = p_school_id)
  
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
    AND (p_school_id IS NULL OR t.school_id = p_school_id)
  
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
    AND (p_school_id IS NULL OR t.school_id = p_school_id)
  
  ORDER BY days_until_expiry ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expired_documents(p_school_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  document_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  school_id UUID,
  school_name TEXT,
  expiration_date DATE,
  days_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  IF p_school_id IS NOT NULL THEN
    SELECT (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND user_roles.school_id = p_school_id
          AND role IN ('school', 'school_staff', 'director', 'parent')
      )
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RAISE EXCEPTION 'Access denied to school data';
    END IF;
  ELSE
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Access denied - admin role required for all-school view';
    END IF;
  END IF;

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
    AND (p_school_id IS NULL OR s.school_id = p_school_id)
  
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
    AND (p_school_id IS NULL OR t.school_id = p_school_id)
  
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
    AND (p_school_id IS NULL OR t.school_id = p_school_id)
  
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
    AND (p_school_id IS NULL OR t.school_id = p_school_id)
  
  ORDER BY days_expired DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_compliance_stats(p_school_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_students INTEGER,
  compliant_students INTEGER,
  student_compliance_rate NUMERIC,
  total_teachers INTEGER,
  compliant_teachers INTEGER,
  teacher_compliance_rate NUMERIC,
  total_expiring_soon INTEGER,
  total_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_students INTEGER;
  v_compliant_students INTEGER;
  v_total_teachers INTEGER;
  v_compliant_teachers INTEGER;
  v_expiring_soon INTEGER;
  v_expired INTEGER;
  v_has_access BOOLEAN;
BEGIN
  IF p_school_id IS NOT NULL THEN
    SELECT (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND school_id = p_school_id
          AND role IN ('school', 'school_staff', 'director', 'parent')
      )
    ) INTO v_has_access;
    
    IF NOT v_has_access THEN
      RAISE EXCEPTION 'Access denied to school data';
    END IF;
  ELSE
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Access denied - admin role required for all-school view';
    END IF;
  END IF;

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
  FROM get_expiring_documents(p_school_id, 60) e;
  
  SELECT COUNT(*) INTO v_expired
  FROM get_expired_documents(p_school_id) e;
  
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