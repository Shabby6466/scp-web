import { api } from '@/lib/api';

export const studentParentService = {
  getParentsOfStudent: (studentId: string) => api.get(`/student-parents/student/${studentId}`),
  getStudentsOfParent: (parentId: string) => api.get(`/student-parents/parent/${parentId}`),
  registerChild: (data: {
    childEmail: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gradeLevel?: string | null;
    password?: string | null;
  }) => api.post('/student-parents/register-child', data),
  createLink: (data: {
    studentProfileId: string;
    parentId: string;
    relation?: string;
    isPrimary?: boolean;
  }) => api.post('/student-parents', data),
  removeLink: (id: string) => api.delete(`/student-parents/${id}`),
};
