-- ============================================
-- PART 5: Add teacher self-service RLS policies
-- ============================================

-- 5.1 Teachers can view their own teacher record
CREATE POLICY "Teachers can view their own record"
ON public.teachers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'teacher'
    AND ur.school_id = teachers.school_id
  )
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 5.2 Teachers can view their own documents
CREATE POLICY "Teachers can view their own documents"
ON public.teacher_documents
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_documents.teacher_id
    AND t.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'teacher'
    AND ur.school_id = teacher_documents.school_id
  )
);

-- 5.3 Teachers can view their own eligibility profile
CREATE POLICY "Teachers can view their own eligibility profile"
ON public.teacher_eligibility_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_eligibility_profiles.teacher_id
    AND t.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'teacher'
    AND ur.school_id = teacher_eligibility_profiles.school_id
  )
);

-- 5.4 Teachers can update their own eligibility profile
CREATE POLICY "Teachers can update their own eligibility profile"
ON public.teacher_eligibility_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_eligibility_profiles.teacher_id
    AND t.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'teacher'
    AND ur.school_id = teacher_eligibility_profiles.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = teacher_eligibility_profiles.teacher_id
    AND t.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'teacher'
    AND ur.school_id = teacher_eligibility_profiles.school_id
  )
);