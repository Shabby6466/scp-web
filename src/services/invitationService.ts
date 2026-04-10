import { api } from '@/lib/api';

export const invitationService = {
  send: (data: { schoolId: string; branchId?: string; email: string; role: string }) => api.post('/invitations', data),
  list: (schoolId?: string) => api.get(`/invitations${schoolId ? `?schoolId=${schoolId}` : ''}`),
  validate: (token: string) => api.get(`/invitations/validate/${token}`),
  accept: (token: string, userId: string) => api.post(`/invitations/accept/${token}`, { userId }),
  revoke: (id: string) => api.patch(`/invitations/${id}/revoke`),
};
