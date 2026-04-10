-- Create a function to get cron job history for the expiration reminders
CREATE OR REPLACE FUNCTION public.get_cron_job_history()
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to view cron history
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    jrd.runid,
    jrd.jobid,
    jrd.job_pid,
    jrd.database,
    jrd.username,
    jrd.command,
    jrd.status,
    jrd.return_message,
    jrd.start_time,
    jrd.end_time
  FROM cron.job_run_details jrd
  JOIN cron.job j ON jrd.jobid = j.jobid
  WHERE j.jobname = 'daily-expiration-reminders'
  ORDER BY jrd.start_time DESC
  LIMIT 50;
END;
$$;