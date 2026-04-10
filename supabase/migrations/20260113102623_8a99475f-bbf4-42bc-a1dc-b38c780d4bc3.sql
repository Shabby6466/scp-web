-- Fix SECURITY DEFINER VIEW issue by converting to SECURITY INVOKER
-- This ensures RLS policies are applied based on the querying user

DROP VIEW IF EXISTS public.teachers_directory;

CREATE VIEW public.teachers_directory 
WITH (security_invoker = true)
AS
SELECT 
  id, school_id, branch_id, first_name, last_name,
  position_id, employment_status, created_at
FROM teachers 
WHERE deleted_at IS NULL;

GRANT SELECT ON public.teachers_directory TO authenticated;

-- The "USING (true)" INSERT policies are intentional for:
-- 1. audit_events - service role inserts only (no user client access needed)
-- 2. auth_audit_logs - service role inserts only  
-- 3. compliance_reminders_log - service role inserts only
-- 4. error_logs - service role inserts only
-- 5. schools - "Temporary open school registration" for self-signup

-- Fix: Replace open school registration with scoped policy
DROP POLICY IF EXISTS "Temporary open school registration" ON public.schools;

-- Only authenticated users can register schools (they become school owner)
CREATE POLICY "Authenticated users can register schools" ON public.schools
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- NOTE: The remaining "true" policies are for service-role only tables 
-- (audit_events, auth_audit_logs, compliance_reminders_log, error_logs)
-- These are intentional as the tables are only written to by edge functions
-- using service role key, not by client-side code