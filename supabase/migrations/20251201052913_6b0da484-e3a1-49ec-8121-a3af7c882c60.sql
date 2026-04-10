-- Create user_consent table for FERPA/DOH compliance
CREATE TABLE IF NOT EXISTS public.user_consent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  privacy_policy_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent
CREATE POLICY "Users can view their own consent"
  ON public.user_consent
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent
CREATE POLICY "Users can insert their own consent"
  ON public.user_consent
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent
CREATE POLICY "Users can update their own consent"
  ON public.user_consent
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_consent_updated_at
  BEFORE UPDATE ON public.user_consent
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();