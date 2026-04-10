-- ============================================================================
-- CRITICAL SECURITY FIXES
-- ============================================================================

-- Fix 1: Prevent privilege escalation via user_roles
-- Add trigger to prevent parents from receiving system roles
CREATE OR REPLACE FUNCTION public.prevent_parent_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent assigning admin, school, school_staff, or director roles to existing parents
  IF NEW.role IN ('admin', 'school', 'school_staff', 'director') THEN
    -- Check if user already has parent role
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.user_id AND role = 'parent'
    ) THEN
      RAISE EXCEPTION 'Cannot assign system role to existing parent account';
    END IF;
  END IF;
  
  -- Prevent assigning parent role to users with system roles
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

CREATE TRIGGER enforce_role_separation
BEFORE INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_parent_privilege_escalation();

-- Fix 2: Split "FOR ALL" policies into explicit operations with proper checks
-- Drop existing broad policies and replace with specific ones

-- Fix teacher_documents policies
DROP POLICY IF EXISTS "Directors can manage teacher documents at their school" ON public.teacher_documents;
DROP POLICY IF EXISTS "School staff can manage their school teacher documents" ON public.teacher_documents;
DROP POLICY IF EXISTS "Admins can manage all teacher documents" ON public.teacher_documents;

-- Recreate with explicit operations
CREATE POLICY "Directors can select teacher docs at their school"
ON public.teacher_documents
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Directors can insert teacher docs at their school"
ON public.teacher_documents
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can update teacher docs at their school"
ON public.teacher_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can soft delete teacher docs at their school"
ON public.teacher_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

-- School staff policies for teacher_documents
CREATE POLICY "School staff can select their school teacher docs"
ON public.teacher_documents
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
  AND deleted_at IS NULL
);

CREATE POLICY "School staff can insert their school teacher docs"
ON public.teacher_documents
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can update their school teacher docs"
ON public.teacher_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

-- Admin policies
CREATE POLICY "Admins can select all teacher docs"
ON public.teacher_documents
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert teacher docs"
ON public.teacher_documents
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teacher docs"
ON public.teacher_documents
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix teachers policies
DROP POLICY IF EXISTS "Directors can manage teachers at their school" ON public.teachers;
DROP POLICY IF EXISTS "School staff can manage their school teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage all teachers" ON public.teachers;

CREATE POLICY "Directors can select teachers at their school"
ON public.teachers
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Directors can insert teachers at their school"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can update teachers at their school"
ON public.teachers
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "School staff can select their school teachers"
ON public.teachers
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
  AND deleted_at IS NULL
);

CREATE POLICY "School staff can insert their school teachers"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can update their school teachers"
ON public.teachers
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "Admins can select all teachers"
ON public.teachers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert teachers"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teachers"
ON public.teachers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix required_documents policies
DROP POLICY IF EXISTS "Directors can manage required documents at their school" ON public.required_documents;
DROP POLICY IF EXISTS "School staff can manage their school required documents" ON public.required_documents;
DROP POLICY IF EXISTS "Admins can manage all required documents" ON public.required_documents;

CREATE POLICY "Directors can select required docs at their school"
ON public.required_documents
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can insert required docs at their school"
ON public.required_documents
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can update required docs at their school"
ON public.required_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can delete required docs at their school"
ON public.required_documents
FOR DELETE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "School staff can select required docs"
ON public.required_documents
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can insert required docs"
ON public.required_documents
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can update required docs"
ON public.required_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can delete required docs"
ON public.required_documents
FOR DELETE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "Admins can manage all required docs"
ON public.required_documents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fix staff_required_documents policies
DROP POLICY IF EXISTS "Directors can manage staff required docs at their school" ON public.staff_required_documents;
DROP POLICY IF EXISTS "School staff can manage their school staff required documents" ON public.staff_required_documents;
DROP POLICY IF EXISTS "Admins can manage all staff required documents" ON public.staff_required_documents;

CREATE POLICY "Directors can select staff required docs at their school"
ON public.staff_required_documents
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can insert staff required docs at their school"
ON public.staff_required_documents
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can update staff required docs at their school"
ON public.staff_required_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "Directors can delete staff required docs at their school"
ON public.staff_required_documents
FOR DELETE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

CREATE POLICY "School staff can select staff required docs"
ON public.staff_required_documents
FOR SELECT
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can insert staff required docs"
ON public.staff_required_documents
FOR INSERT
TO authenticated
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can update staff required docs"
ON public.staff_required_documents
FOR UPDATE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "School staff can delete staff required docs"
ON public.staff_required_documents
FOR DELETE
TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

CREATE POLICY "Admins can manage all staff required docs"
ON public.staff_required_documents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fix 3: Restrict user_roles modifications to prevent client tampering
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can select all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix 4: Add constraint to ensure school_id is set for role-specific records
ALTER TABLE public.user_roles 
ADD CONSTRAINT school_id_required_for_school_roles 
CHECK (
  (role IN ('school', 'school_staff', 'director') AND school_id IS NOT NULL) OR
  (role IN ('parent', 'admin') AND school_id IS NULL)
);

-- Fix 5: Create function to validate parent school assignment
CREATE OR REPLACE FUNCTION public.validate_parent_school_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_school_id UUID;
BEGIN
  -- Only apply to students table
  IF TG_TABLE_NAME = 'students' THEN
    -- Get the school_id from user metadata (if any)
    SELECT (auth.jwt()->>'user_metadata')::jsonb->>'school_id' INTO v_user_school_id;
    
    -- If school_id is being set, validate it matches user's metadata school
    IF NEW.school_id IS NOT NULL AND v_user_school_id IS NOT NULL THEN
      IF NEW.school_id::text != v_user_school_id THEN
        RAISE EXCEPTION 'Cannot assign student to different school than parent account';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_parent_school_on_student_insert
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.validate_parent_school_assignment();