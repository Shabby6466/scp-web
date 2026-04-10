import { api } from '@/lib/api';

export const certificationService = {
  // Types
  listTypes: () => api.get('/certification-types'),
  getType: (id: string) => api.get(`/certification-types/${id}`),
  createType: (data: any) => api.post('/certification-types', data),
  updateType: (id: string, data: any) => api.patch(`/certification-types/${id}`, data),
  deleteType: (id: string) => api.delete(`/certification-types/${id}`),

  // Records
  listRecords: (schoolId: string) => api.get(`/schools/${schoolId}/certification-records`),
  getRecord: (schoolId: string, id: string) => api.get(`/schools/${schoolId}/certification-records/${id}`),
  createRecord: (schoolId: string, data: any) => api.post(`/schools/${schoolId}/certification-records`, data),
  updateRecord: (schoolId: string, id: string, data: any) => api.patch(`/schools/${schoolId}/certification-records/${id}`, data),
  deleteRecord: (schoolId: string, id: string) => api.delete(`/schools/${schoolId}/certification-records/${id}`),
};
