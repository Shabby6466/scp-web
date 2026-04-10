-- Fix schools table INSERT policy
DROP POLICY IF EXISTS "Anyone can insert schools during registration" ON schools;

CREATE POLICY "Authenticated users can register schools"
ON schools
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add user_roles INSERT policy for self-registration as school role
CREATE POLICY "Users can register as school role"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'school'::app_role
);