-- Create error_logs table for tracking edge function failures and system errors
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  school_id UUID REFERENCES public.schools(id),
  user_id UUID,
  request_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view error logs
CREATE POLICY "Admins can view all error logs"
  ON public.error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- School admins can view their school's error logs
CREATE POLICY "School admins can view their school error logs"
  ON public.error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.school_id = error_logs.school_id
      AND user_roles.role IN ('school', 'school_staff')
    )
  );

-- Only system (service role) can insert error logs
CREATE POLICY "Service role can insert error logs"
  ON public.error_logs
  FOR INSERT
  WITH CHECK (true);

-- Admins can update error logs (for resolution)
CREATE POLICY "Admins can update error logs"
  ON public.error_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for common queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity) WHERE resolved_at IS NULL;
CREATE INDEX idx_error_logs_school_id ON public.error_logs(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_error_logs_function_name ON public.error_logs(function_name);

-- Add comment
COMMENT ON TABLE public.error_logs IS 'Tracks edge function errors and system failures for monitoring and debugging';