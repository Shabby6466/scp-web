-- Create a function to get expiring documents (within 60 days)
CREATE OR REPLACE FUNCTION public.get_expiring_documents(days_threshold INTEGER DEFAULT 60)
RETURNS TABLE (
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
BEGIN
  RETURN QUERY
  -- Student documents
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
  
  UNION ALL
  
  -- Teacher documents
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
  
  UNION ALL
  
  -- Teacher certifications
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
  
  UNION ALL
  
  -- Teacher background checks
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
  
  ORDER BY days_until_expiry ASC;
END;
$$;

-- Create a function to get expired documents
CREATE OR REPLACE FUNCTION public.get_expired_documents()
RETURNS TABLE (
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
BEGIN
  RETURN QUERY
  -- Student documents
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
  
  UNION ALL
  
  -- Teacher documents
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
  
  UNION ALL
  
  -- Teacher certifications
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
  
  UNION ALL
  
  -- Teacher background checks
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
  
  ORDER BY days_expired DESC;
END;
$$;

-- Create compliance statistics function
CREATE OR REPLACE FUNCTION public.get_compliance_stats(p_school_id UUID DEFAULT NULL)
RETURNS TABLE (
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
BEGIN
  -- Count students
  SELECT COUNT(*) INTO v_total_students
  FROM students s
  WHERE (p_school_id IS NULL OR s.school_id = p_school_id);
  
  -- Count compliant students (all required docs approved and not expired)
  SELECT COUNT(DISTINCT s.id) INTO v_compliant_students
  FROM students s
  WHERE (p_school_id IS NULL OR s.school_id = p_school_id)
    AND NOT EXISTS (
      SELECT 1 FROM documents d
      WHERE d.student_id = s.id
        AND (d.status = 'expired' OR (d.expiration_date IS NOT NULL AND d.expiration_date < CURRENT_DATE))
    );
  
  -- Count teachers
  SELECT COUNT(*) INTO v_total_teachers
  FROM teachers t
  WHERE (p_school_id IS NULL OR t.school_id = p_school_id)
    AND t.employment_status = 'active';
  
  -- Count compliant teachers
  SELECT COUNT(*) INTO v_compliant_teachers
  FROM teachers t
  WHERE (p_school_id IS NULL OR t.school_id = p_school_id)
    AND t.employment_status = 'active'
    AND (t.certification_expiry IS NULL OR t.certification_expiry >= CURRENT_DATE)
    AND (t.background_check_expiry IS NULL OR t.background_check_expiry >= CURRENT_DATE);
  
  -- Count expiring soon (60 days)
  SELECT COUNT(*) INTO v_expiring_soon
  FROM get_expiring_documents(60) e
  WHERE (p_school_id IS NULL OR e.school_id = p_school_id);
  
  -- Count expired
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