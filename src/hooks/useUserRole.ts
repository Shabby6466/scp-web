import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const schoolId = user?.schoolId ?? null;
  const branchId = user?.branchId ?? null;

  return {
    role,
    schoolId,
    branchId,
    getSettingsPath: () => {
      if (!role) return '/auth';
      if (role === 'ADMIN') return '/admin/settings';
      return '/school/settings';
    },
    isAdmin: role === 'ADMIN',
    isDirector: role === 'DIRECTOR',
    isBranchDirector: role === 'BRANCH_DIRECTOR',
    isTeacher: role === 'TEACHER',
    isParent: role === 'PARENT',
    isSchool: role === 'DIRECTOR' || role === 'BRANCH_DIRECTOR',
    isStaff: role === 'ADMIN' || role === 'DIRECTOR',
    isAdminOrStaff: role === 'ADMIN' || role === 'DIRECTOR',
    canManageSchool: role === 'ADMIN' || role === 'DIRECTOR' || role === 'BRANCH_DIRECTOR',
    loading: false,
    hasRole: (roles: string | string[]) => {
      if (!role) return false;
      if (role === 'ADMIN') return true;
      const arr = Array.isArray(roles) ? roles : [roles];
      return arr.some((r) => {
        if (r === 'school') return role === 'DIRECTOR' || role === 'BRANCH_DIRECTOR';
        if (r === 'school_staff') return role === 'DIRECTOR';
        if (r === 'director') return role === 'BRANCH_DIRECTOR';
        if (r === 'admin') return role === 'ADMIN';
        if (r === 'teacher') return role === 'TEACHER';
        if (r === 'parent') return role === 'PARENT';
        return r === role;
      });
    },
    getDashboardPath: () => {
      if (!role) return '/auth';
      if (role === 'ADMIN') return '/admin';
      if (role === 'DIRECTOR' || role === 'BRANCH_DIRECTOR') return '/school-dashboard';
      if (role === 'TEACHER') return '/eligibility';
      return '/dashboard';
    },
    getRoleDisplayName: () => {
      const names: Record<string, string> = {
        ADMIN: 'Admin',
        DIRECTOR: 'School Director',
        BRANCH_DIRECTOR: 'Branch Director',
        TEACHER: 'Teacher',
        PARENT: 'Parent',
      };
      return names[role ?? ''] ?? 'User';
    },
  };
};
