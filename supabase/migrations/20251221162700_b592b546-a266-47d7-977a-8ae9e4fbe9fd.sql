-- Create enums for compliance framework
CREATE TYPE public.compliance_frequency AS ENUM ('one_time', 'monthly', 'quarterly', 'semiannual', 'annual');
CREATE TYPE public.compliance_status AS ENUM ('not_started', 'in_progress', 'complete', 'overdue', 'not_applicable');
CREATE TYPE public.evidence_type AS ENUM ('document', 'photo', 'log', 'link');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_status AS ENUM ('todo', 'doing', 'done');
CREATE TYPE public.reminder_type AS ENUM ('upcoming', 'overdue');
CREATE TYPE public.reminder_channel AS ENUM ('email', 'in_app');

-- A) inspection_types - stores frameworks like DOH / Fire / Building
CREATE TABLE public.inspection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspection_types_school ON public.inspection_types(school_id);
CREATE INDEX idx_inspection_types_name ON public.inspection_types(name);

-- B) compliance_requirement_templates - system defaults/starter packs
CREATE TABLE public.compliance_requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_type_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency public.compliance_frequency NOT NULL DEFAULT 'annual',
  evidence_required BOOLEAN NOT NULL DEFAULT true,
  evidence_types public.evidence_type[] DEFAULT ARRAY['document']::public.evidence_type[],
  suggested_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  risk_level public.risk_level NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requirement_templates_type ON public.compliance_requirement_templates(inspection_type_name);

-- C) compliance_requirements - school-specific requirements
CREATE TABLE public.compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  inspection_type_id UUID NOT NULL REFERENCES public.inspection_types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  owner_user_id UUID,
  frequency public.compliance_frequency NOT NULL DEFAULT 'annual',
  interval_value INTEGER DEFAULT 1,
  due_date DATE,
  next_due_date DATE,
  status public.compliance_status NOT NULL DEFAULT 'not_started',
  last_completed_at TIMESTAMPTZ,
  requires_review BOOLEAN NOT NULL DEFAULT false,
  evidence_required BOOLEAN NOT NULL DEFAULT true,
  risk_level public.risk_level NOT NULL DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requirements_school ON public.compliance_requirements(school_id);
CREATE INDEX idx_requirements_inspection ON public.compliance_requirements(inspection_type_id);
CREATE INDEX idx_requirements_status ON public.compliance_requirements(status);
CREATE INDEX idx_requirements_due ON public.compliance_requirements(next_due_date);
CREATE INDEX idx_requirements_owner ON public.compliance_requirements(owner_user_id);

-- D) compliance_evidence - links proof to requirements
CREATE TABLE public.compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.compliance_requirements(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  evidence_type public.evidence_type NOT NULL,
  document_id UUID,
  file_path TEXT,
  url TEXT,
  note TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_requirement ON public.compliance_evidence(requirement_id);
CREATE INDEX idx_evidence_school ON public.compliance_evidence(school_id);

-- E) compliance_tasks - auto-generated tasks
CREATE TABLE public.compliance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  due_date DATE,
  status public.task_status NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_school ON public.compliance_tasks(school_id);
CREATE INDEX idx_tasks_assigned ON public.compliance_tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.compliance_tasks(status);

-- F) compliance_reminders_log - audit trail
CREATE TABLE public.compliance_reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE SET NULL,
  reminder_type public.reminder_type NOT NULL,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel public.reminder_channel NOT NULL DEFAULT 'email'
);

CREATE INDEX idx_reminders_school ON public.compliance_reminders_log(school_id);
CREATE INDEX idx_reminders_requirement ON public.compliance_reminders_log(requirement_id);

-- Enable RLS on all tables
ALTER TABLE public.inspection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reminders_log ENABLE ROW LEVEL SECURITY;

-- RLS for inspection_types
CREATE POLICY "Admins can manage all inspection types"
ON public.inspection_types FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can manage inspection types at their school"
ON public.inspection_types FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));

CREATE POLICY "School staff can view inspection types at their school"
ON public.inspection_types FOR SELECT
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));

CREATE POLICY "School staff can manage inspection types"
ON public.inspection_types FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));

-- RLS for compliance_requirement_templates (system defaults - read only for all authenticated)
CREATE POLICY "Anyone can view requirement templates"
ON public.compliance_requirement_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage templates"
ON public.compliance_requirement_templates FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS for compliance_requirements
CREATE POLICY "Admins can manage all requirements"
ON public.compliance_requirements FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can manage requirements at their school"
ON public.compliance_requirements FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));

CREATE POLICY "School staff can manage requirements at their school"
ON public.compliance_requirements FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));

-- RLS for compliance_evidence
CREATE POLICY "Admins can manage all evidence"
ON public.compliance_evidence FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can manage evidence at their school"
ON public.compliance_evidence FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));

CREATE POLICY "School staff can manage evidence at their school"
ON public.compliance_evidence FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));

-- RLS for compliance_tasks
CREATE POLICY "Admins can manage all tasks"
ON public.compliance_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can manage tasks at their school"
ON public.compliance_tasks FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));

CREATE POLICY "School staff can manage tasks at their school"
ON public.compliance_tasks FOR ALL
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')))
WITH CHECK (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));

CREATE POLICY "Users can view tasks assigned to them"
ON public.compliance_tasks FOR SELECT
USING (assigned_to = auth.uid());

-- RLS for compliance_reminders_log
CREATE POLICY "Admins can view all reminders"
ON public.compliance_reminders_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Directors can view reminders at their school"
ON public.compliance_reminders_log FOR SELECT
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role = 'director'));

CREATE POLICY "School staff can view reminders at their school"
ON public.compliance_reminders_log FOR SELECT
USING (school_id IN (SELECT school_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('school', 'school_staff')));

CREATE POLICY "Service can insert reminders"
ON public.compliance_reminders_log FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_inspection_types_updated_at
BEFORE UPDATE ON public.inspection_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at
BEFORE UPDATE ON public.compliance_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.compliance_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  p_last_completed TIMESTAMPTZ,
  p_frequency public.compliance_frequency,
  p_interval_value INTEGER DEFAULT 1
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_last_completed IS NULL THEN
    RETURN NULL;
  END IF;
  
  CASE p_frequency
    WHEN 'one_time' THEN
      RETURN NULL;
    WHEN 'monthly' THEN
      RETURN (p_last_completed + (p_interval_value || ' months')::INTERVAL)::DATE;
    WHEN 'quarterly' THEN
      RETURN (p_last_completed + (p_interval_value * 3 || ' months')::INTERVAL)::DATE;
    WHEN 'semiannual' THEN
      RETURN (p_last_completed + (p_interval_value * 6 || ' months')::INTERVAL)::DATE;
    WHEN 'annual' THEN
      RETURN (p_last_completed + (p_interval_value || ' years')::INTERVAL)::DATE;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;

-- Function to get compliance stats for a school
CREATE OR REPLACE FUNCTION public.get_inspection_compliance_stats(p_school_id UUID)
RETURNS TABLE(
  inspection_type_id UUID,
  inspection_name TEXT,
  total_requirements INTEGER,
  completed_count INTEGER,
  overdue_count INTEGER,
  due_30_days INTEGER,
  due_60_days INTEGER,
  due_90_days INTEGER,
  readiness_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    it.id as inspection_type_id,
    it.name as inspection_name,
    COUNT(cr.id)::INTEGER as total_requirements,
    COUNT(CASE WHEN cr.status = 'complete' THEN 1 END)::INTEGER as completed_count,
    COUNT(CASE WHEN cr.status = 'overdue' OR (cr.next_due_date IS NOT NULL AND cr.next_due_date < CURRENT_DATE AND cr.status != 'complete') THEN 1 END)::INTEGER as overdue_count,
    COUNT(CASE WHEN cr.next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 THEN 1 END)::INTEGER as due_30_days,
    COUNT(CASE WHEN cr.next_due_date BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60 THEN 1 END)::INTEGER as due_60_days,
    COUNT(CASE WHEN cr.next_due_date BETWEEN CURRENT_DATE + 61 AND CURRENT_DATE + 90 THEN 1 END)::INTEGER as due_90_days,
    CASE 
      WHEN COUNT(cr.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN cr.status = 'complete' OR cr.status = 'not_applicable' THEN 1 END)::NUMERIC / COUNT(cr.id)) * 100, 1)
      ELSE 100 
    END as readiness_score
  FROM inspection_types it
  LEFT JOIN compliance_requirements cr ON cr.inspection_type_id = it.id
  WHERE it.school_id = p_school_id
  GROUP BY it.id, it.name
  ORDER BY it.name;
END;
$$;