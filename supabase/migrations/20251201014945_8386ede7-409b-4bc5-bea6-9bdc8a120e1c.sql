-- Create teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  hire_date DATE,
  certification_type TEXT,
  certification_expiry DATE,
  background_check_date DATE,
  background_check_expiry DATE,
  employment_status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, email)
);

-- Create teacher_documents table
CREATE TABLE public.teacher_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teachers
CREATE POLICY "Admins can manage all teachers"
ON public.teachers
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "School staff can view their school teachers"
ON public.teachers
FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid() AND (role = 'school' OR role = 'school_staff')
  )
);

CREATE POLICY "School staff can manage their school teachers"
ON public.teachers
FOR ALL
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid() AND (role = 'school' OR role = 'school_staff')
  )
);

-- RLS Policies for teacher_documents
CREATE POLICY "Admins can manage all teacher documents"
ON public.teacher_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "School staff can view their school teacher documents"
ON public.teacher_documents
FOR SELECT
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid() AND (role = 'school' OR role = 'school_staff')
  )
);

CREATE POLICY "School staff can manage their school teacher documents"
ON public.teacher_documents
FOR ALL
USING (
  school_id IN (
    SELECT school_id FROM user_roles
    WHERE user_id = auth.uid() AND (role = 'school' OR role = 'school_staff')
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_documents_updated_at
BEFORE UPDATE ON public.teacher_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for teacher documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('teacher-documents', 'teacher-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for teacher-documents bucket
CREATE POLICY "Admins can manage teacher documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'teacher-documents' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "School staff can view their school teacher documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'teacher-documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND (role = 'school' OR role = 'school_staff')
  )
);

CREATE POLICY "School staff can upload teacher documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'teacher-documents' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'school_staff') OR has_role(auth.uid(), 'school'))
);