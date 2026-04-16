import { api } from '@/lib/api';

export const studentProfileService = {
  getById: (id: string) => api.get(`/student-profiles/${id}`),
  /** Merged school-wide + branch STUDENT document types for this profile (aligned with document summary). */
  listRequiredDocumentTypes: (studentProfileId: string) =>
    api.get(`/student-profiles/${studentProfileId}/required-document-types`),
  /** Batched merged requirement counts (same rules as listRequiredDocumentTypes). */
  getRequiredDocumentTypeCounts: (studentProfileIds: string[]) =>
    api.post<{ counts: Record<string, number> }>(
      '/student-profiles/required-document-type-counts',
      { studentProfileIds },
    ),
  update: (
    id: string,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gradeLevel?: string | null;
      schoolId?: string | null;
      branchId?: string | null;
    },
  ) => api.patch(`/student-profiles/${id}`, data),
};
