import { api } from '@/lib/api';

/** Enrolled child profiles (`StudentProfile`), not parent login accounts. */
export const studentsService = {
  create: (data: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    grade_level?: string | null;
    school_id: string;
    parent_id?: string | null;
    branch_id?: string | null;
  }) => api.post<{ id: string }>('/students', data),
};
