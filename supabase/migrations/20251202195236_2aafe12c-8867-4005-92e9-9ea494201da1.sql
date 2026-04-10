-- Create audit_events table for universal event logging
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_events_event_type ON public.audit_events(event_type);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_user ON public.audit_events(user_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view all audit events
CREATE POLICY "Admins can view all audit events"
ON public.audit_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Directors can view audit events for their school's entities
CREATE POLICY "Directors can view audit events for their school"
ON public.audit_events
FOR SELECT
USING (
  metadata->>'school_id' IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'director'
  )
);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert audit events"
ON public.audit_events
FOR INSERT
WITH CHECK (true);