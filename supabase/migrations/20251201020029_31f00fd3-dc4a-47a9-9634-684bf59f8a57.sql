-- Drop vulnerable storage policies
DROP POLICY IF EXISTS "School staff can delete their template files" ON storage.objects;
DROP POLICY IF EXISTS "School staff can update their template files" ON storage.objects;
DROP POLICY IF EXISTS "School staff can upload templates" ON storage.objects;

-- Create secure storage policies for document-templates bucket
CREATE POLICY "School staff can upload template files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-templates' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'school_staff'::app_role) 
    OR has_role(auth.uid(), 'school'::app_role)
  )
);

CREATE POLICY "School staff can update template files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'document-templates' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'school_staff'::app_role) 
    OR has_role(auth.uid(), 'school'::app_role)
  )
);

CREATE POLICY "School staff can delete template files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'document-templates' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'school_staff'::app_role) 
    OR has_role(auth.uid(), 'school'::app_role)
  )
);