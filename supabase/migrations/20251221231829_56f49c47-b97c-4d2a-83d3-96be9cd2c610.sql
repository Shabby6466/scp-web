-- Add index for student_id lookups on parent_invitations
CREATE INDEX IF NOT EXISTS idx_parent_invites_student_id ON parent_invitations(student_id);

-- Add composite index for school + branch lookups
CREATE INDEX IF NOT EXISTS idx_parent_invites_school_branch ON parent_invitations(school_id, branch_id);

-- Drop existing constraint (not index) if it exists
ALTER TABLE parent_invitations DROP CONSTRAINT IF EXISTS unique_pending_invitation;

-- Create partial unique index: only one active invite per (student_id, parent_email)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_invite_per_student 
ON parent_invitations (student_id, parent_email) 
WHERE status IN ('pending', 'sent') AND student_id IS NOT NULL;

-- Create helper function to check if parent has access to a student via student_parents table
CREATE OR REPLACE FUNCTION public.parent_has_student_access(p_user_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check student_parents junction table
    SELECT 1 FROM student_parents sp
    JOIN parents p ON sp.parent_id = p.id
    WHERE p.user_id = p_user_id
    AND sp.student_id = p_student_id
  )
  OR EXISTS (
    -- Also check legacy parent_id column for backwards compatibility
    SELECT 1 FROM students s
    WHERE s.id = p_student_id AND s.parent_id = p_user_id
  )
$$;

-- Update RLS on students table for parent access via junction table
DROP POLICY IF EXISTS "Parents can view their own students" ON public.students;
DROP POLICY IF EXISTS "Parents can view linked students" ON public.students;
DROP POLICY IF EXISTS "Parents can insert their own students" ON public.students;

-- Create new parent policy that checks both legacy and junction table
CREATE POLICY "Parents can view linked students"
ON public.students FOR SELECT
USING (
  deleted_at IS NULL AND (
    auth.uid() = parent_id  -- Legacy direct link
    OR parent_has_student_access(auth.uid(), id)  -- Junction table link
  )
);

-- Allow parents to create students (legacy behavior)
CREATE POLICY "Parents can insert their own students"
ON public.students FOR INSERT
WITH CHECK (auth.uid() = parent_id);

-- Update RLS on documents table for parent access via junction table
DROP POLICY IF EXISTS "Parents can view linked student documents" ON public.documents;
DROP POLICY IF EXISTS "Parents can create linked student documents" ON public.documents;
DROP POLICY IF EXISTS "Parents can create documents for their students" ON public.documents;

-- Create new parent policies that check both legacy and junction table
CREATE POLICY "Parents can view linked student documents"
ON public.documents FOR SELECT
USING (
  deleted_at IS NULL AND (
    auth.uid() = parent_id  -- Legacy direct link (uploader)
    OR parent_has_student_access(auth.uid(), student_id)  -- Junction table link
  )
);

CREATE POLICY "Parents can create linked student documents"
ON public.documents FOR INSERT
WITH CHECK (
  auth.uid() = parent_id  -- Parent must be the uploader
  AND parent_has_student_access(auth.uid(), student_id)  -- AND must have access to student
);

-- Add RLS for parents to view their own student links
DROP POLICY IF EXISTS "Parents can view their student links" ON public.student_parents;

CREATE POLICY "Parents can view their student links"
ON public.student_parents FOR SELECT
USING (
  parent_id IN (
    SELECT id FROM parents WHERE user_id = auth.uid()
  )
);