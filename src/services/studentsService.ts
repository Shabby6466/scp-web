import { api } from '@/lib/api';

/** Creates a student login (`User` role STUDENT) plus linked `StudentProfile`. */
export const studentsService = {
  create: (data: {
    email: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    grade_level?: string | null;
    school_id: string;
    parent_id?: string | null;
    branch_id?: string | null;
    password?: string | null;
  }) => api.post<{ id: string }>('/students', data),
};
