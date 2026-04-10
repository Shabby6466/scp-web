-- Create staff_required_documents table
CREATE TABLE public.staff_required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_required_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_required_documents
CREATE POLICY "Admins can manage all staff required documents"
ON public.staff_required_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "School staff can manage their school staff required documents"
ON public.staff_required_documents
FOR ALL
USING (school_id IN (
  SELECT school_id FROM user_roles
  WHERE user_id = auth.uid()
  AND (role = 'school'::app_role OR role = 'school_staff'::app_role)
));

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id
  OR (is_broadcast = true AND school_id IN (
    SELECT school_id FROM user_roles WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Add updated_at trigger for staff_required_documents
CREATE TRIGGER update_staff_required_documents_updated_at
BEFORE UPDATE ON public.staff_required_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();