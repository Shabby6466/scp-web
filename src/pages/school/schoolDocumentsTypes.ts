export type OwnerKind = 'student_profile' | 'teacher' | 'other';

export type SchoolDocRow = {
  id: string;
  documentTypeId: string | null;
  fileName: string;
  createdAt: string;
  expiresAt: string | null;
  verifiedAt: string | null;
  ownerLabel: string;
  ownerSub: string | null;
  ownerKind: OwnerKind;
  documentTypeName: string;
  categorySlug: string;
  daysUntilExpiry: number | null;
  /** Shape compatible with DocumentReviewDialog / DocumentViewerModal */
  legacyDialog: Record<string, unknown>;
};

function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const d = new Date(raw as string);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function normalizeDocumentRow(raw: Record<string, unknown>): SchoolDocRow {
  const dt = (raw.documentType ?? raw.document_type) as Record<string, unknown> | undefined;
  const cat = dt?.category as Record<string, unknown> | string | undefined;
  let categorySlug = 'other';
  if (typeof cat === 'object' && cat !== null) {
    const slug = cat.slug ?? cat.name;
    categorySlug = String(slug ?? 'other')
      .toLowerCase()
      .replace(/\s+/g, '_');
  } else if (typeof cat === 'string' && cat) {
    categorySlug = cat;
  } else if (typeof dt?.name === 'string') {
    categorySlug = dt.name.toLowerCase().replace(/\s+/g, '_');
  }

  const sp = (raw.studentProfile ?? raw.student_profile) as Record<string, unknown> | null | undefined;
  const owner = (raw.ownerUser ?? raw.owner_user) as Record<string, unknown> | null | undefined;

  const fileName = String(raw.fileName ?? raw.file_name ?? '');
  const createdAt = parseDate(raw.createdAt ?? raw.created_at) ?? new Date().toISOString();
  const expiresAt = parseDate(raw.expiresAt ?? raw.expiration_date ?? raw.expires_at);
  const verifiedAt = parseDate(raw.verifiedAt ?? raw.verified_at);

  let ownerKind: OwnerKind = 'other';
  let ownerLabel = '';
  let ownerSub: string | null = null;

  if (sp && typeof sp === 'object') {
    ownerKind = 'student_profile';
    const fn = String(sp.firstName ?? sp.first_name ?? '');
    const ln = String(sp.lastName ?? sp.last_name ?? '');
    ownerLabel = `${fn} ${ln}`.trim() || 'Student';
    const gl = sp.gradeLevel ?? sp.grade_level;
    if (gl) ownerSub = String(gl);
    const ouEmail = owner && String(owner.email ?? '');
    if (ouEmail) ownerSub = ownerSub ? `${ownerSub} · ${ouEmail}` : ouEmail;
  } else if (owner && String(owner.role) === 'TEACHER') {
    ownerKind = 'teacher';
    ownerLabel = String(owner.name ?? '').trim() || String(owner.email ?? '');
    ownerSub = String(owner.email ?? '') || null;
  } else if (owner) {
    ownerLabel = String(owner.name ?? '').trim() || String(owner.email ?? '');
    ownerSub = String(owner.email ?? '') || null;
  } else {
    ownerLabel = 'Unknown';
  }

  const documentTypeName = dt ? String(dt.name ?? '') : '';
  const documentTypeId =
    (raw.documentTypeId as string | undefined) ??
    (typeof dt?.id === 'string' ? dt.id : null) ??
    null;

  const expMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const now = Date.now();
  const daysUntilExpiry =
    expMs === null ? null : Math.ceil((expMs - now) / (1000 * 60 * 60 * 24));

  const legacyStudents = sp
    ? {
        first_name: String(sp.firstName ?? sp.first_name ?? ''),
        last_name: String(sp.lastName ?? sp.last_name ?? ''),
        grade_level: (sp.gradeLevel ?? sp.grade_level) as string | null | undefined,
      }
    : null;

  const legacyDialog: Record<string, unknown> = {
    ...raw,
    id: String(raw.id),
    file_name: fileName,
    fileName,
    file_path: '',
    file_size: 0,
    student_id: String(raw.studentProfileId ?? raw.student_profile_id ?? ''),
    parent_id: String(raw.ownerUserId ?? raw.owner_user_id ?? ''),
    created_at: createdAt,
    createdAt,
    updated_at: createdAt,
    expiration_date: expiresAt,
    expiresAt,
    status: verifiedAt ? 'approved' : 'pending',
    category: categorySlug,
    students: legacyStudents,
  };

  return {
    id: String(raw.id),
    documentTypeId,
    fileName,
    createdAt,
    expiresAt,
    verifiedAt,
    ownerLabel,
    ownerSub,
    ownerKind,
    documentTypeName,
    categorySlug,
    daysUntilExpiry,
    legacyDialog,
  };
}
