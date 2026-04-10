-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Allow authenticated school registration" ON schools;

-- Temporarily allow ALL users to register schools (we'll lock this down after testing)
CREATE POLICY "Temporary open school registration"
ON schools
FOR INSERT
TO public
WITH CHECK (true);