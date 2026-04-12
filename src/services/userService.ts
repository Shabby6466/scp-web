import { api, unwrapList } from '@/lib/api';

const SCHOOL_USER_PAGE_LIMIT = '500';

export const userService = {
  /** Lists users; when `schoolId` is set, uses `GET /schools/:schoolId/users` (matches the API). */
  list: async (params?: {
    role?: string;
    schoolId?: string;
    branchId?: string;
    query?: string;
    /** Alias for `query` (some callers use `search`) */
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.role) {
      qs.set('role', params.role.toUpperCase());
    }
    if (params?.branchId) qs.set('branchId', params.branchId);
    const textQ = params?.query ?? params?.search;
    if (textQ) qs.set('query', textQ);
    qs.set('limit', SCHOOL_USER_PAGE_LIMIT);
    if (params?.schoolId) {
      const res = await api.get(
        `/schools/${params.schoolId}/users?${qs.toString()}`,
      );
      return unwrapList(res);
    }
    const res = await api.get(`/users?${qs.toString()}`);
    return unwrapList(res);
  },
  getById: (id: string) => api.get(`/users/${id}`),
  getDetail: (id: string) => api.get(`/users/${id}/detail`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  listTeachers: async (schoolId: string, branchId?: string) => {
    const res = await api.get(
      `/schools/${schoolId}/users?role=TEACHER${branchId ? `&branchId=${branchId}` : ''}&limit=${SCHOOL_USER_PAGE_LIMIT}`,
    );
    return unwrapList(res);
  },
  listStudents: async (schoolId: string, branchId?: string) => {
    const res = await api.get(
      `/schools/${schoolId}/users?role=STUDENT${branchId ? `&branchId=${branchId}` : ''}&limit=${SCHOOL_USER_PAGE_LIMIT}`,
    );
    return unwrapList(res);
  },
  listBySchool: async (schoolId: string) => {
    const res = await api.get(
      `/schools/${schoolId}/users?limit=${SCHOOL_USER_PAGE_LIMIT}`,
    );
    return unwrapList(res);
  },
  search: async (query: string) => {
    const res = await api.get(
      `/users/search?query=${encodeURIComponent(query)}&limit=100`,
    );
    return unwrapList(res);
  },
  remove: (id: string) => api.delete(`/users/${id}`),
};
