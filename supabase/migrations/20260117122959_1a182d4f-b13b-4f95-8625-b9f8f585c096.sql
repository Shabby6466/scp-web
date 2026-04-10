
-- ============================================================
-- SECURITY HARDENING MIGRATION - FINAL FIXES
-- ============================================================

-- 1. Add rate_limits policies (table has RLS enabled but no policies)
CREATE POLICY "Service role only select" ON public.rate_limits
FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role only insert" ON public.rate_limits
FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role only update" ON public.rate_limits
FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role only delete" ON public.rate_limits
FOR DELETE TO service_role USING (true);

-- 2. Grant service role access to rate_limits
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;

-- 3. Index for faster rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON public.rate_limits (identifier, endpoint);

-- 4. Fix certification_types - restrict public access
DROP POLICY IF EXISTS "Anyone can view system certification types" ON public.certification_types;

CREATE POLICY "Authenticated users can view certification types"
ON public.certification_types
FOR SELECT
TO authenticated
USING (true);

-- 5. Fix compliance_requirement_templates - restrict public access  
DROP POLICY IF EXISTS "Anyone can view requirement templates" ON public.compliance_requirement_templates;

CREATE POLICY "Authenticated users can view requirement templates"
ON public.compliance_requirement_templates
FOR SELECT
TO authenticated
USING (true);

-- 6. Recreate teachers_directory with security_invoker
DROP VIEW IF EXISTS public.teachers_directory;

CREATE VIEW public.teachers_directory
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.first_name,
  t.last_name,
  t.email,
  t.phone,
  t.school_id,
  t.branch_id,
  t.employment_status,
  t.position_id,
  t.hire_date,
  t.created_at,
  sb.branch_name
FROM teachers t
LEFT JOIN school_branches sb ON t.branch_id = sb.id
WHERE t.deleted_at IS NULL 
  AND t.employment_status = 'active';

-- 7. Fix schools insert policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can register schools" ON public.schools;

CREATE POLICY "Authenticated users can register their school"
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
