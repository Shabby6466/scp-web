-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can register schools" ON schools;

-- Create a very simple INSERT policy that allows authenticated users
CREATE POLICY "Allow authenticated school registration"
ON schools
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);