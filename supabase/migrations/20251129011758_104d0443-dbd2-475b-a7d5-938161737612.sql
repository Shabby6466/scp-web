-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-templates',
  'document-templates',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/jpeg', 'image/png']
);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT template_ownership CHECK (
    (is_system_template = true AND school_id IS NULL) OR
    (is_system_template = false AND school_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- System templates are viewable by all authenticated users
CREATE POLICY "System templates are viewable by all"
ON public.document_templates
FOR SELECT
USING (is_system_template = true);

-- School-specific templates viewable by that school's staff
CREATE POLICY "School staff can view their templates"
ON public.document_templates
FOR SELECT
USING (
  NOT is_system_template AND
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (user_roles.role = 'school' OR user_roles.role = 'school_staff')
  )
);

-- School staff can create templates for their school
CREATE POLICY "School staff can create templates"
ON public.document_templates
FOR INSERT
WITH CHECK (
  NOT is_system_template AND
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (user_roles.role = 'school' OR user_roles.role = 'school_staff')
  )
);

-- School staff can update their templates
CREATE POLICY "School staff can update their templates"
ON public.document_templates
FOR UPDATE
USING (
  NOT is_system_template AND
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (user_roles.role = 'school' OR user_roles.role = 'school_staff')
  )
);

-- School staff can delete their templates
CREATE POLICY "School staff can delete their templates"
ON public.document_templates
FOR DELETE
USING (
  NOT is_system_template AND
  school_id IN (
    SELECT user_roles.school_id
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (user_roles.role = 'school' OR user_roles.role = 'school_staff')
  )
);

-- Admins can manage all templates including system templates
CREATE POLICY "Admins can manage all templates"
ON public.document_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Storage policies for document-templates bucket
CREATE POLICY "Authenticated users can view templates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'document-templates');

CREATE POLICY "School staff can upload templates"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'document-templates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can manage template files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'document-templates' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "School staff can update their template files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'document-templates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "School staff can delete their template files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'document-templates' AND
  auth.uid() IS NOT NULL
);

-- Add trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_document_templates_category ON public.document_templates(category);
CREATE INDEX idx_document_templates_school ON public.document_templates(school_id);
CREATE INDEX idx_document_templates_system ON public.document_templates(is_system_template);