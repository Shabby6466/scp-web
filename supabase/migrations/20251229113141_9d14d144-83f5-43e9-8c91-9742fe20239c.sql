-- ============================================
-- PART 2: Create helper function for director branch access (updated version)
-- This function checks if a director has access to a specific branch
-- Directors with NULL branch_id can see all branches in their school
-- ============================================
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

-- ============================================
-- PART 3: Update handle_new_user trigger to handle teachers
-- ============================================
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

-- ============================================
-- PART 4: Update director RLS policies to use branch_id scoping
-- For tables that have branch_id column
-- ============================================

-- 4.1 STUDENTS table - Directors can only see students in their branch
DROP POLICY IF EXISTS "Directors can view students at their school" ON public.students;
CREATE POLICY "Directors can view students in their branch"
ON public.students
FOR SELECT
USING (
  deleted_at IS NULL
  AND school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    -- Director without branch_id sees all students in their school
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = students.school_id
      AND ur.branch_id IS NULL
    )
    -- Director with branch_id only sees their branch
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

-- 4.2 TEACHERS table - Directors can only see teachers in their branch
DROP POLICY IF EXISTS "Directors can select teachers at their school" ON public.teachers;
DROP POLICY IF EXISTS "Directors can view teachers at their school" ON public.teachers;
CREATE POLICY "Directors can view teachers in their branch"
ON public.teachers
FOR SELECT
USING (
  deleted_at IS NULL
  AND school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teachers.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

DROP POLICY IF EXISTS "Directors can insert teachers at their school" ON public.teachers;
CREATE POLICY "Directors can insert teachers in their branch"
ON public.teachers
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teachers.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

DROP POLICY IF EXISTS "Directors can update teachers at their school" ON public.teachers;
CREATE POLICY "Directors can update teachers in their branch"
ON public.teachers
FOR UPDATE
USING (
  deleted_at IS NULL
  AND school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teachers.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
)
WITH CHECK (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
);

-- 4.3 TEACHER_DOCUMENTS table - Directors can only see docs for teachers in their branch
DROP POLICY IF EXISTS "Directors can select teacher docs at their school" ON public.teacher_documents;
DROP POLICY IF EXISTS "Directors can view teacher documents at their school" ON public.teacher_documents;
CREATE POLICY "Directors can view teacher docs in their branch"
ON public.teacher_documents
FOR SELECT
USING (
  deleted_at IS NULL
  AND school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teacher_documents.school_id
      AND ur.branch_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_documents.teacher_id
      AND director_has_branch_access(auth.uid(), t.branch_id)
    )
  )
);

DROP POLICY IF EXISTS "Directors can insert teacher docs at their school" ON public.teacher_documents;
CREATE POLICY "Directors can insert teacher docs in their branch"
ON public.teacher_documents
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teacher_documents.school_id
      AND ur.branch_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_documents.teacher_id
      AND director_has_branch_access(auth.uid(), t.branch_id)
    )
  )
);

DROP POLICY IF EXISTS "Directors can update teacher docs at their school" ON public.teacher_documents;
DROP POLICY IF EXISTS "Directors can soft delete teacher docs at their school" ON public.teacher_documents;
CREATE POLICY "Directors can update teacher docs in their branch"
ON public.teacher_documents
FOR UPDATE
USING (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teacher_documents.school_id
      AND ur.branch_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.id = teacher_documents.teacher_id
      AND director_has_branch_access(auth.uid(), t.branch_id)
    )
  )
);

-- 4.4 TEACHER_INVITATIONS table - Directors can only manage invitations for their branch
DROP POLICY IF EXISTS "Directors can view their school invitations" ON public.teacher_invitations;
CREATE POLICY "Directors can view invitations in their branch"
ON public.teacher_invitations
FOR SELECT
USING (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teacher_invitations.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

DROP POLICY IF EXISTS "Directors can create teacher invitations" ON public.teacher_invitations;
CREATE POLICY "Directors can create invitations in their branch"
ON public.teacher_invitations
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teacher_invitations.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

DROP POLICY IF EXISTS "Directors can update their school invitations" ON public.teacher_invitations;
CREATE POLICY "Directors can update invitations in their branch"
ON public.teacher_invitations
FOR UPDATE
USING (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = teacher_invitations.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

-- 4.5 PARENT_INVITATIONS table - Directors can only manage invitations for their branch
DROP POLICY IF EXISTS "Directors can view parent invitations at their school" ON public.parent_invitations;
CREATE POLICY "Directors can view parent invitations in their branch"
ON public.parent_invitations
FOR SELECT
USING (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = parent_invitations.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

DROP POLICY IF EXISTS "Directors can create parent invitations at their school" ON public.parent_invitations;
CREATE POLICY "Directors can create parent invitations in their branch"
ON public.parent_invitations
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = parent_invitations.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

DROP POLICY IF EXISTS "Directors can update parent invitations at their school" ON public.parent_invitations;
CREATE POLICY "Directors can update parent invitations in their branch"
ON public.parent_invitations
FOR UPDATE
USING (
  school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = parent_invitations.school_id
      AND ur.branch_id IS NULL
    )
    OR director_has_branch_access(auth.uid(), branch_id)
  )
);

-- 4.6 DOCUMENTS table - Directors can only see documents for students in their branch
DROP POLICY IF EXISTS "Directors can view documents at their school" ON public.documents;
CREATE POLICY "Directors can view documents in their branch"
ON public.documents
FOR SELECT
USING (
  deleted_at IS NULL
  AND school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = documents.school_id
      AND ur.branch_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = documents.student_id
      AND director_has_branch_access(auth.uid(), s.branch_id)
    )
  )
);

DROP POLICY IF EXISTS "Directors can update documents at their school" ON public.documents;
CREATE POLICY "Directors can update documents in their branch"
ON public.documents
FOR UPDATE
USING (
  deleted_at IS NULL
  AND school_id IN (
    SELECT ur.school_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'director'
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.school_id = documents.school_id
      AND ur.branch_id IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = documents.student_id
      AND director_has_branch_access(auth.uid(), s.branch_id)
    )
  )
);