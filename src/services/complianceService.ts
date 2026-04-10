import { api } from '@/lib/api';

export const complianceService = {
  // Compliance Categories
  listCategories: (schoolId?: string) => api.get(`/compliance-categories${schoolId ? `?schoolId=${schoolId}` : ''}`),
  getCategoryById: (id: string) => api.get(`/compliance-categories/${id}`),
  getCategoryBySlug: (slug: string) => api.get(`/compliance-categories/by-slug/${slug}`),
  getCategoryScore: (id: string) => api.get(`/compliance-categories/${id}/score`),
  createCategory: (data: any) => api.post('/compliance-categories', data),
  updateCategory: (id: string, data: any) => api.patch(`/compliance-categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/compliance-categories/${id}`),

  // Compliance Requirements
  listRequirements: (schoolId: string) => api.get(`/schools/${schoolId}/compliance-requirements`),
  getRequirement: (schoolId: string, id: string) => api.get(`/schools/${schoolId}/compliance-requirements/${id}`),
  createRequirement: (schoolId: string, data: any) => api.post(`/schools/${schoolId}/compliance-requirements`, data),
  updateRequirement: (schoolId: string, id: string, data: any) => api.patch(`/schools/${schoolId}/compliance-requirements/${id}`, data),
  deleteRequirement: (schoolId: string, id: string) => api.delete(`/schools/${schoolId}/compliance-requirements/${id}`),

  // Inspection Types
  listInspectionTypes: (schoolId: string) => api.get(`/schools/${schoolId}/inspection-types`),
  createInspectionType: (schoolId: string, data: any) => api.post(`/schools/${schoolId}/inspection-types`, data),
  updateInspectionType: (schoolId: string, id: string, data: any) => api.patch(`/schools/${schoolId}/inspection-types/${id}`, data),
  deleteInspectionType: (schoolId: string, id: string) => api.delete(`/schools/${schoolId}/inspection-types/${id}`),
};
