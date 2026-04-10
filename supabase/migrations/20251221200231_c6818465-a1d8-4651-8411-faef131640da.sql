-- Add student_id, branch_id, parent_first_name, parent_last_name to parent_invitations table
ALTER TABLE parent_invitations 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES school_branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS parent_first_name TEXT,
ADD COLUMN IF NOT EXISTS parent_last_name TEXT;

-- Create validate_parent_invitation function
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

-- Add RLS policy for directors to manage parent invitations at their school
CREATE POLICY "Directors can view parent invitations at their school"
ON parent_invitations
FOR SELECT
USING (
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'director'
  )
);

CREATE POLICY "Directors can create parent invitations at their school"
ON parent_invitations
FOR INSERT
WITH CHECK (
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'director'
  )
);

CREATE POLICY "Directors can update parent invitations at their school"
ON parent_invitations
FOR UPDATE
USING (
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'director'
  )
);