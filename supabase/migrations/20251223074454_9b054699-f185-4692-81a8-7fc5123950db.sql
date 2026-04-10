-- Create storage bucket for staff resumes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-resumes',
  'staff-resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS policies for staff-resumes bucket

-- School staff can upload resumes for their school
CREATE POLICY "School staff can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

-- School staff can view resumes for their school
CREATE POLICY "School staff can view resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

-- School staff can update resumes for their school
CREATE POLICY "School staff can update resumes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

-- School staff can delete resumes for their school
CREATE POLICY "School staff can delete resumes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('school', 'school_staff')
  )
);

-- Directors can manage resumes for their school
CREATE POLICY "Directors can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'director'
  )
);

CREATE POLICY "Directors can view resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'director'
  )
);

CREATE POLICY "Directors can update resumes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'director'
  )
);

CREATE POLICY "Directors can delete resumes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'staff-resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT school_id::text FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'director'
  )
);

-- Admins can manage all resumes
CREATE POLICY "Admins can manage all resumes"
ON storage.objects FOR ALL
USING (
  bucket_id = 'staff-resumes' 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'staff-resumes' 
  AND has_role(auth.uid(), 'admin')
);