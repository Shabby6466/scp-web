import { api } from '@/lib/api';

export const eligibilityService = {
  getByUser: (userId: string) => api.get(`/eligibility-profiles/user/${userId}`),
  upsert: (userId: string, data: any) => api.put(`/eligibility-profiles/user/${userId}`, data),
  analyze: (userId: string) => api.post(`/eligibility-profiles/user/${userId}/analyze`),
};
