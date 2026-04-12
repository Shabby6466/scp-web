-- Create platform_settings table for persisting admin settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can read all settings"
ON public.platform_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.platform_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete settings
CREATE POLICY "Admins can delete settings"
ON public.platform_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
('general', '{"maintenanceMode": false, "platformName": "SCP"}', 'General platform settings'),
('registration', '{"allowSchoolSelfRegistration": true, "allowParentSelfRegistration": true, "autoConfirmEmails": true, "requireSchoolApproval": true}', 'Registration and approval settings'),
('notifications', '{"emailNotificationsEnabled": true, "sendWelcomeEmails": true, "sendExpirationReminders": true, "reminderDaysBeforeExpiry": 30}', 'Notification settings'),
('security', '{"sessionTimeout": 60, "maxLoginAttempts": 5}', 'Security settings');