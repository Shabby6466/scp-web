-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can register schools" ON schools;

-- Create a PERMISSIVE policy (uses OR logic, not AND)
CREATE POLICY "Authenticated users can register schools"
ON schools
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure the user_roles policy is permissive
DROP POLICY IF EXISTS "Users can register as school role" ON user_roles;

CREATE POLICY "Users can register as school role"
ON user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'school'::app_role
);