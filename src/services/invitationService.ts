import { api } from '@/lib/api';

export const invitationService = {
  send: (data: { schoolId: string; branchId?: string; email: string; role: string }) => api.post('/invitations', data),
  /** Uses `POST /invitations/send-teacher` (only schoolId, branchId, email — whitelisted for ValidationPipe). */
  sendTeacher: (data: { schoolId: string; branchId?: string | null; email: string }) =>
    api.post('/invitations/send-teacher', {
      schoolId: data.schoolId,
      ...(data.branchId ? { branchId: data.branchId } : {}),
      email: data.email,
    }),
  list: (schoolId?: string) => api.get(`/invitations${schoolId ? `?schoolId=${schoolId}` : ''}`),
  validate: (token: string) => api.get(`/invitations/validate/${token}`),
  accept: (token: string, userId: string) => api.post(`/invitations/accept/${token}`, { userId }),
  revoke: (id: string) => api.patch(`/invitations/${id}/revoke`),
};
