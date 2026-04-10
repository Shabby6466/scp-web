-- =====================================================
-- SECURITY HARDENING PHASE 1: Critical Database Fixes
-- (Handling existing policies gracefully)
-- =====================================================

-- 1. Create rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS on rate_limits (only service role should access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create function for checking rate limits (used by edge functions)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count integer;
  v_allowed boolean;
BEGIN
  v_window_start := now() - (p_window_ms || ' milliseconds')::interval;
  
  INSERT INTO rate_limits (identifier, endpoint, window_start, request_count)
  VALUES (p_identifier, p_endpoint, now(), 1)
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET 
    request_count = CASE 
      WHEN rate_limits.window_start < v_window_start THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE 
      WHEN rate_limits.window_start < v_window_start THEN now()
      ELSE rate_limits.window_start
    END
  RETURNING request_count INTO v_current_count;
  
  v_allowed := v_current_count <= p_max_requests;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_current_count)
  );
END;
$$;

-- Clean up rate_limits periodically
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$;

-- 2. Fix profiles table RLS - Drop ALL existing and recreate
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "School staff can view parent profiles at their school" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate proper policies
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "School staff can view parent profiles at their school" ON public.profiles
FOR SELECT USING (
  id IN (
    SELECT p.user_id FROM parents p 
    WHERE p.user_id IS NOT NULL
    AND p.school_id IN (
      SELECT school_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('school', 'school_staff', 'director', 'admin')
    )
  )
);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Create teachers_directory view (limited fields for privacy)
DROP VIEW IF EXISTS public.teachers_directory;
CREATE VIEW public.teachers_directory AS
SELECT 
  id, school_id, branch_id, first_name, last_name,
  position_id, employment_status, created_at
FROM teachers WHERE deleted_at IS NULL;

GRANT SELECT ON public.teachers_directory TO authenticated;

-- 4. Fix invitation policies - drop and recreate
DROP POLICY IF EXISTS "School staff can view parent invitations" ON public.parent_invitations;
DROP POLICY IF EXISTS "School staff can view parent invitations at their school" ON public.parent_invitations;

CREATE POLICY "School staff can view parent invitations at their school" ON public.parent_invitations
FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM user_roles 
    WHERE user_id = auth.uid() AND role IN ('school', 'school_staff', 'director', 'admin')
  )
);

DROP POLICY IF EXISTS "School staff can view teacher invitations" ON public.teacher_invitations;
DROP POLICY IF EXISTS "School staff can view teacher invitations at their school" ON public.teacher_invitations;

CREATE POLICY "School staff can view teacher invitations at their school" ON public.teacher_invitations
FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM user_roles 
    WHERE user_id = auth.uid() AND role IN ('school', 'school_staff', 'director', 'admin')
  )
);

DROP POLICY IF EXISTS "School can view director invitations" ON public.director_invitations;
DROP POLICY IF EXISTS "School can view director invitations at their school" ON public.director_invitations;

CREATE POLICY "School can view director invitations at their school" ON public.director_invitations
FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM user_roles 
    WHERE user_id = auth.uid() AND role IN ('school', 'admin')
  )
);

-- 5. Fix schools table - replace overly permissive policy
DROP POLICY IF EXISTS "Anyone can view approved schools" ON public.schools;
DROP POLICY IF EXISTS "Public can view approved schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view their associated schools" ON public.schools;

CREATE POLICY "Users can view their associated schools" ON public.schools
FOR SELECT USING (
  id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND school_id IS NOT NULL)
  OR id IN (SELECT school_id FROM students WHERE parent_id = auth.uid() AND school_id IS NOT NULL)
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR (is_approved = true AND deleted_at IS NULL)
);

-- 6. Add indexes for rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- 7. Audit trigger for user_roles changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_events (event_type, entity_type, entity_id, user_id, metadata)
    VALUES ('role_assigned', 'user_roles', NEW.id::text, auth.uid(),
      jsonb_build_object('target_user_id', NEW.user_id, 'role', NEW.role, 'school_id', NEW.school_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_events (event_type, entity_type, entity_id, user_id, metadata)
    VALUES ('role_updated', 'user_roles', NEW.id::text, auth.uid(),
      jsonb_build_object('target_user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role, 'school_id', NEW.school_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_events (event_type, entity_type, entity_id, user_id, metadata)
    VALUES ('role_removed', 'user_roles', OLD.id::text, auth.uid(),
      jsonb_build_object('target_user_id', OLD.user_id, 'role', OLD.role, 'school_id', OLD.school_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_user_role_changes ON public.user_roles;
CREATE TRIGGER trigger_audit_user_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();