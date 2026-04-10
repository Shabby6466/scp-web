import { api } from '@/lib/api';

export const studentParentService = {
  getParentsOfStudent: (studentId: string) => api.get(`/student-parents/student/${studentId}`),
  getStudentsOfParent: (parentId: string) => api.get(`/student-parents/parent/${parentId}`),
  createLink: (data: { studentId: string; parentId: string; relation?: string; isPrimary?: boolean }) => api.post('/student-parents', data),
  removeLink: (id: string) => api.delete(`/student-parents/${id}`),
};
