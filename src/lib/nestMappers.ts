/**
 * Normalize Nest/TypeORM shapes for legacy UI components expect.
 */

export function mapDocumentFromNest(d: Record<string, unknown>): Record<string, unknown> {
  const dt = d.documentType as Record<string, unknown> | undefined;
  const cat =
    (dt?.category as string) ||
    (typeof dt?.name === 'string'
      ? String(dt.name)
          .toLowerCase()
          .replace(/\s+/g, '_')
      : '');

  const verifiedAt = d.verifiedAt as string | Date | null | undefined;
  const expiresAt = d.expiresAt as string | Date | null | undefined;

  let status = 'pending';
  if (verifiedAt) {
    status = 'approved';
  } else if (expiresAt) {
    const ex = new Date(expiresAt).getTime();
    if (!Number.isNaN(ex) && ex < Date.now()) {
      status = 'expired';
    }
  }

  const sizeBytes = d.sizeBytes as number | undefined;
  return {
    ...d,
    student_id: d.ownerUserId,
    ownerUserId: d.ownerUserId,
    file_name: d.fileName,
    file_size: sizeBytes ?? (d as { file_size?: number }).file_size ?? 0,
    created_at: d.createdAt,
    expiration_date: d.expiresAt,
    rejection_reason: d.rejectionReason,
    category: cat,
    status,
  };
}


export function mapStudentFromParentLink(link: {
  student?: {
    id: string;
    name?: string | null;
    schoolId?: string | null;
    branchId?: string | null;
    studentProfile?: {
      firstName?: string | null;
      lastName?: string | null;
      dateOfBirth?: string | null;
      gradeLevel?: string | null;
    } | null;
  };
}, parentId: string) {
  const s = link.student;
  if (!s?.id) return null;
  const sp = s.studentProfile;
  const parts = (s.name || '').trim().split(/\s+/).filter(Boolean);
  const first = sp?.firstName ?? parts[0] ?? '';
  const last = sp?.lastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : '');
  const dobRaw = sp?.dateOfBirth;
  const date_of_birth = dobRaw
    ? new Date(dobRaw).toISOString().slice(0, 10)
    : '';

  return {
    id: s.id,
    first_name: first,
    last_name: last,
    date_of_birth,
    school_id: s.schoolId ?? null,
    branch_id: s.branchId ?? null,
    grade_level: sp?.gradeLevel ?? null,
    parent_id: parentId,
    school_name: null as string | null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    deleted_by: null,
  };
}
