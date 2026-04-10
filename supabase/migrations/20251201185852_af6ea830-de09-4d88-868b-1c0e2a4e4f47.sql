-- RLS policies for director role with school-specific access

-- Directors can view students at their school
CREATE POLICY "Directors can view students at their school"
ON students
FOR SELECT
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can view documents at their school
CREATE POLICY "Directors can view documents at their school"
ON documents
FOR SELECT
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can update document status at their school
CREATE POLICY "Directors can update documents at their school"
ON documents
FOR UPDATE
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can view teachers at their school
CREATE POLICY "Directors can view teachers at their school"
ON teachers
FOR SELECT
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can manage teachers at their school
CREATE POLICY "Directors can manage teachers at their school"
ON teachers
FOR ALL
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can view teacher documents at their school
CREATE POLICY "Directors can view teacher documents at their school"
ON teacher_documents
FOR SELECT
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can manage teacher documents at their school
CREATE POLICY "Directors can manage teacher documents at their school"
ON teacher_documents
FOR ALL
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can view profiles (parents)
CREATE POLICY "Directors can view profiles at their school"
ON profiles
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT parent_id
    FROM students
    WHERE school_id IN (
      SELECT school_id
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'director'
    )
  )
);

-- Directors can view their own school
CREATE POLICY "Directors can view their school"
ON schools
FOR SELECT
USING (
  id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can view messages at their school
CREATE POLICY "Directors can view messages at their school"
ON messages
FOR SELECT
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
  AND deleted_at IS NULL
);

-- Directors can send messages at their school
CREATE POLICY "Directors can send messages at their school"
ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
);

-- Directors can view required documents at their school
CREATE POLICY "Directors can view required documents at their school"
ON required_documents
FOR SELECT
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
);

-- Directors can manage required documents at their school
CREATE POLICY "Directors can manage required documents at their school"
ON required_documents
FOR ALL
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
);

-- Directors can manage staff required documents at their school
CREATE POLICY "Directors can manage staff required docs at their school"
ON staff_required_documents
FOR ALL
USING (
  school_id IN (
    SELECT school_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'director'
  )
);

-- Directors can view audit logs for their school
CREATE POLICY "Directors can view audit logs at their school"
ON auth_audit_logs
FOR SELECT
USING (
  user_id IN (
    SELECT DISTINCT s.parent_id
    FROM students s
    WHERE s.school_id IN (
      SELECT school_id
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'director'
    )
    UNION
    SELECT user_id
    FROM user_roles
    WHERE school_id IN (
      SELECT school_id
      FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'director'
    )
  )
);