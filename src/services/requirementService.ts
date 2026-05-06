import { api } from '@/lib/api';

export type ScopeLevel = 'PLATFORM' | 'SCHOOL' | 'BRANCH';
export type AssignmentStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'WAIVED';

export type RequirementRule = {
  id: string;
  documentTypeId: string;
  scopeLevel: ScopeLevel;
  schoolId: string | null;
  branchId: string | null;
  targetRole: string;
  cadence: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  documentType?: { id: string; name: string; category?: { id: string; name: string; slug: string } };
};

export type RequirementAssignment = {
  id: string;
  ruleId: string | null;
  documentTypeId: string;
  categoryId: string | null;
  subjectUserId: string | null;
  subjectStudentProfileId: string | null;
  schoolId: string;
  branchId: string;
  dueDate: string | null;
  status: AssignmentStatus;
  latestDocumentId: string | null;
  latestExpiresAt: string | null;
  lastTransitionAt: string;
  documentType?: { id: string; name: string; category?: { id: string; name: string; slug: string } };
  latestDocument?: { id: string; fileName: string; reviewStatus: string } | null;
};

export const requirementService = {
  // ── Rules ────────────────────────────────────────────────────────────────
  listRules: (params?: {
    schoolId?: string;
    branchId?: string;
    targetRole?: string;
    isActive?: boolean;
  }) => api.get<RequirementRule[]>('/requirements/rules', { params }),

  createRule: (body: {
    documentTypeId: string;
    scopeLevel: ScopeLevel;
    schoolId?: string;
    branchId?: string;
    targetRole: string;
    cadence?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    isActive?: boolean;
  }) => api.post<RequirementRule>('/requirements/rules', body),

  updateRule: (
    id: string,
    body: { isActive?: boolean; effectiveTo?: string; cadence?: string },
  ) => api.patch<RequirementRule>(`/requirements/rules/${id}`, body),

  // ── Assignments ──────────────────────────────────────────────────────────
  listAssignments: (params?: {
    branchId?: string;
    categoryId?: string;
    status?: AssignmentStatus;
    subjectUserId?: string;
  }) => api.get<RequirementAssignment[]>('/requirements/assignments', { params }),

  myAssignments: () =>
    api.get<RequirementAssignment[]>('/requirements/assignments/mine'),

  waive: (id: string, reason?: string) =>
    api.patch<RequirementAssignment>(`/requirements/assignments/${id}/waive`, { reason }),

  review: (
    id: string,
    body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
  ) => api.patch<RequirementAssignment>(`/requirements/assignments/${id}/review`, body),
};
