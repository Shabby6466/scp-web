/**
 * Canonical route families + shared navigation metadata.
 *
 * Inventory (canonical → page / guard):
 * - /admin, /admin/settings, … — AdminRoute + AdminLayout (unchanged except people/requirements paths)
 * - /admin/people/* — SchoolRoute inside AdminLayout? No — people routes under /admin are AdminRoute.
 *   Components: AdminStudents, AdminTeachers, AdminParents, AdminLeadershipDirectory
 * - /school/people/* — SchoolRoute + SchoolPeoplePortal (director/branch director; admin redirected to /admin/people/*)
 * - /school/requirements — canonical requirements hub (?tab=…); legacy /admin/requirements/* and /school/requirements/* paths redirect here
 * - /compliance-center(/doh|/facility|/certifications) — SchoolRoute
 * - /school/documents — SchoolDocumentsPage (+ legacy redirects)
 *
 * Legacy URLs are kept as `<Navigate replace />` aliases in App.tsx.
 */

import type { UserRole } from '@/types/api';

/** Admin-scoped people directory */
export const ADMIN_PEOPLE = {
  students: '/admin/people/students',
  staff: '/admin/people/staff',
  parents: '/admin/people/parents',
  directors: '/admin/people/directors',
  branchDirectors: '/admin/people/branch-directors',
} as const;

/** School-scoped people directory (directors / branch directors) */
export const SCHOOL_PEOPLE = {
  students: '/school/people/students',
  staff: '/school/people/staff',
  parents: '/school/people/parents',
  branchDirectors: '/school/people/branch-directors',
} as const;

/** Tab query values for the unified requirements page */
export const REQUIREMENTS_TAB = {
  students: 'students',
  staff: 'staff',
  parents: 'parents',
  schoolDirectors: 'school-directors',
  branchDirectors: 'branch-directors',
} as const;

export type RequirementsTabParam =
  (typeof REQUIREMENTS_TAB)[keyof typeof REQUIREMENTS_TAB];

/** Canonical requirements URLs (school scope; platform admins use the same routes). */
export const SCHOOL_REQUIREMENTS = {
  root: '/school/requirements',
  withTab: (tab: RequirementsTabParam) =>
    `/school/requirements?tab=${encodeURIComponent(tab)}`,
  students: '/school/requirements?tab=students',
  staff: '/school/requirements?tab=staff',
  parents: '/school/requirements?tab=parents',
  schoolDirectors: '/school/requirements?tab=school-directors',
  branchDirectors: '/school/requirements?tab=branch-directors',
} as const;

/** @deprecated Use SCHOOL_REQUIREMENTS — admin requirement screens share the same canonical URLs. */
export const ADMIN_REQUIREMENTS = SCHOOL_REQUIREMENTS;

export const COMPLIANCE_CENTER = {
  root: '/compliance-center',
  doh: '/compliance-center/doh',
  facility: '/compliance-center/facility',
  certifications: '/compliance-center/certifications',
} as const;

/** Breadcrumb + sidebar labels for known paths (includes legacy aliases for pre-redirect flash). */
export const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/students': 'Students',
  '/admin/parents': 'Parents',
  '/admin/staff': 'Staff',
  '/admin/directors': 'School directors',
  '/admin/branch-directors': 'Branch directors',
  '/admin/people/students': 'Students',
  '/admin/people/staff': 'Staff',
  '/admin/people/parents': 'Parents',
  '/admin/people/directors': 'School directors',
  '/admin/people/branch-directors': 'Branch directors',
  '/admin/schools': 'Schools',
  '/admin/documents': 'Documents',
  '/admin/settings': 'Admin Settings',
  '/admin/student-requirements': 'Requirements',
  '/admin/staff-documents': 'Requirements',
  '/admin/requirements/students': 'Requirements',
  '/admin/requirements/staff': 'Requirements',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/privacy-settings': 'Privacy & policy',
  '/admin/messages': 'Message center',
  '/admin/reminders': 'Reminders',
  '/director-dashboard': 'Director Dashboard',
  '/school-dashboard': 'School Dashboard',
  '/dashboard': 'Parent Dashboard',
  '/compliance-center': 'Compliance Center',
  '/compliance-center/doh': 'DOH Compliance',
  '/compliance-center/facility': 'Facility & Safety',
  '/compliance-center/certifications': 'Certifications',
  '/school/documents': 'Documents',
  '/all-documents': 'Browse by person',
  '/school/pending-documents': 'Documents',
  '/school/expiring-documents': 'Documents',
  '/school/settings': 'School Settings',
  '/school/branches': 'Branches',
  '/school/students': 'Students',
  '/school/staff': 'Staff',
  '/school/parents': 'Parents',
  '/school/branch-directors': 'Branch directors',
  '/school/people/students': 'Students',
  '/school/people/staff': 'Staff',
  '/school/people/parents': 'Parents',
  '/school/people/branch-directors': 'Branch directors',
  '/school/teacher-compliance': 'Documents',
  '/school/student-requirements': 'Requirements',
  '/school/staff-documents': 'Requirements',
  '/school/requirements': 'Requirements',
  '/school/requirements/rules': 'Requirements',
  '/school/requirements/students': 'Requirements',
  '/school/requirements/staff': 'Requirements',
  '/school/requirements/parents': 'Requirements',
  '/school/requirements/school-directors': 'Requirements',
  '/school/requirements/branch-directors': 'Requirements',
  '/eligibility': 'Eligibility portal',
};

export function getHomePathForRole(role: UserRole | null): string {
  if (!role) return '/auth';
  if (role === 'ADMIN') return '/admin';
  if (role === 'DIRECTOR' || role === 'BRANCH_DIRECTOR') return '/school-dashboard';
  if (role === 'TEACHER') return '/eligibility';
  if (role === 'STUDENT') return '/dashboard';
  return '/dashboard';
}

export function getHomeLabelForRole(role: UserRole | null): string {
  if (!role) return 'Dashboard';
  if (role === 'ADMIN') return 'Admin';
  if (role === 'DIRECTOR') return 'Director';
  if (role === 'BRANCH_DIRECTOR') return 'School';
  if (role === 'TEACHER') return 'Teacher';
  return 'Dashboard';
}

export function labelForPath(pathname: string): string {
  return (
    ROUTE_LABELS[pathname] ||
    pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ||
    'Page'
  );
}

/** Admin redirect map: school people URL → admin people URL (used by SchoolPeoplePortal). */
export const SCHOOL_TO_ADMIN_PEOPLE: Record<string, string> = {
  [SCHOOL_PEOPLE.students]: ADMIN_PEOPLE.students,
  [SCHOOL_PEOPLE.staff]: ADMIN_PEOPLE.staff,
  [SCHOOL_PEOPLE.parents]: ADMIN_PEOPLE.parents,
  [SCHOOL_PEOPLE.branchDirectors]: ADMIN_PEOPLE.branchDirectors,
};
