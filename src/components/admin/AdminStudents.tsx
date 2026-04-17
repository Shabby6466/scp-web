import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { useUserRole } from '@/hooks/useUserRole';
import { toast as toastHook } from '@/hooks/use-toast';
import { schoolService } from '@/services/schoolService';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { studentProfileService } from '@/services/studentProfileService';
import { studentsService } from '@/services/studentsService';
import { userService } from '@/services/userService';
import { ApiError } from '@/lib/api';
import { invitationService } from '@/services/invitationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit, FileText, Calendar, School as SchoolIcon, GraduationCap, Mail, CheckCircle, UserCheck, RefreshCw, X, Filter, Trash2, UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import StudentInviteDialog from './StudentInviteDialog';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade_level: string | null;
  school_name: string | null;
  school_id: string | null;
  parent_id: string;
  created_at: string;
  parent?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  documents?: Array<{
    id: string;
    category: string;
    status: string;
  }>;
  // Parent onboarding status
  documentsCount: number;
  hasLinkedParent: boolean;
  latestInvite?: {
    status: string;
    created_at: string;
  };
}

interface School {
  id: string;
  name: string;
}

interface ParentOption {
  id: string;
  name: string;
  email: string;
}

/** Backend may send null, odd strings, or objects; never throw from Date parsing. */
function toDateOnlyString(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const d = new Date(raw as string);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDobForUi(isoOrRaw: string): string {
  const s = (isoOrRaw ?? '').trim();
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

type ParentOnboardingStatus =
  | { type: 'docs_received' }
  | { type: 'parent_linked' }
  | { type: 'invite_pending'; createdAt: string }
  | { type: 'needs_invite' };

function getParentOnboardingStatus(student: Student): ParentOnboardingStatus {
  // Priority 1: Has documents uploaded → parent already onboarded
  if (student.documentsCount > 0) {
    return { type: 'docs_received' };
  }

  // Priority 2: Has linked parent via junction table
  if (student.hasLinkedParent) {
    return { type: 'parent_linked' };
  }

  // Priority 3: Has active (pending/sent) invitation
  const invite = student.latestInvite;
  if (invite && ['pending', 'sent'].includes(invite.status)) {
    return { type: 'invite_pending', createdAt: invite.created_at };
  }

  // Default: Needs invitation
  return { type: 'needs_invite' };
}

function getEnrollmentStatus(student: Student) {
  const hasIncomplete = student.documents?.some((doc) => doc.status === 'pending');
  const hasExpired = student.documents?.some((doc) => doc.status === 'expired');

  if (hasExpired) return { label: 'Expired Docs', color: 'destructive' };
  if (hasIncomplete) return { label: 'Incomplete', color: 'secondary' };
  return { label: 'Complete', color: 'default' };
}

const AdminStudents = () => {
  const navigate = useNavigate();
  const { schoolId: viewerSchoolId, isAdmin } = useUserRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [parentStatusFilter, setParentStatusFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [linkStudent, setLinkStudent] = useState<Student | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availableParents, setAvailableParents] = useState<ParentOption[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [relation, setRelation] = useState('');
  const [linkingParent, setLinkingParent] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  /** School at dialog open — only send `schoolId` on PATCH if this changed (avoids 403 for branch directors). */
  const [editSchoolSnapshot, setEditSchoolSnapshot] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [newStudent, setNewStudent] = useState({
    school_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    grade_level: '',
  });

  const schoolsForAdd = useMemo(() => {
    if (isAdmin) return schools;
    if (viewerSchoolId) return schools.filter((s) => s.id === viewerSchoolId);
    return schools;
  }, [isAdmin, viewerSchoolId, schools]);

  // Quick filter counts - memoized to avoid recalculating on every render
  const quickFilterCounts = useMemo(() => ({
    all: students.length,
    complete: students.filter(s => getEnrollmentStatus(s).label === 'Complete').length,
    incomplete: students.filter(s => getEnrollmentStatus(s).label === 'Incomplete').length,
    expired: students.filter(s => getEnrollmentStatus(s).label === 'Expired Docs').length,
    needsInvite: students.filter(s => getParentOnboardingStatus(s).type === 'needs_invite').length,
    invitePending: students.filter(s => getParentOnboardingStatus(s).type === 'invite_pending').length,
  }), [students]);

  const hasActiveFilters = searchQuery || schoolFilter !== 'all' || statusFilter !== 'all' || parentStatusFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSchoolFilter('all');
    setStatusFilter('all');
    setParentStatusFilter('all');
  };

  useEffect(() => {
    fetchStudents();
    fetchSchools();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, searchQuery, schoolFilter, statusFilter, parentStatusFilter]);

  const fetchSchools = async () => {
    try {
      const data = await schoolService.list();
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const schoolsData = await schoolService.list();
      const schoolArr = Array.isArray(schoolsData) ? schoolsData : (schoolsData as any)?.data ?? [];
      const studentsList: any[] = [];
      for (const sch of schoolArr) {
        try {
          const list = await schoolService.listStudents(sch.id);
          for (const p of list) {
            studentsList.push({
              ...p,
              school_id: sch.id,
              school_name: sch.name,
            });
          }
        } catch {
          /* school may be inaccessible */
        }
      }

      const studentIds = studentsList.map((s: any) => s.id);

      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      const [allDocs, allInvitations] = await Promise.all([
        documentService.search(),
        invitationService.list(),
      ]);

      const docsByStudent: Record<string, Array<{ id: string; category: string; status: string }>> = {};
      const docCountsByStudent: Record<string, number> = {};
      (allDocs || []).forEach((doc: any) => {
        const sid = doc.studentProfileId ?? doc.student_profile_id;
        if (!sid || !studentIds.includes(sid)) return;
        if (!docsByStudent[sid]) {
          docsByStudent[sid] = [];
          docCountsByStudent[sid] = 0;
        }
        const cat =
          doc.documentType?.category ||
          doc.category ||
          (doc.documentType?.name ? String(doc.documentType.name).toLowerCase().replace(/\s+/g, '_') : '');
        docsByStudent[sid].push({
          id: doc.id,
          category: cat,
          status: doc.status || (doc.verifiedAt ? 'approved' : 'pending'),
        });
        docCountsByStudent[sid]++;
      });

      const linkedStudentIds = new Set<string>();
      await Promise.all(
        studentIds.map(async (sid: string) => {
          try {
            const parents = await studentParentService.getParentsOfStudent(sid);
            if (parents && parents.length > 0) linkedStudentIds.add(sid);
          } catch { /* no link */ }
        })
      );

      const invitesByStudent: Record<string, { status: string; created_at: string }> = {};
      (allInvitations || []).forEach((inv: any) => {
        const sid = inv.studentProfileId ?? inv.student_id;
        if (sid && !invitesByStudent[sid]) {
          invitesByStudent[sid] = { status: inv.status, created_at: inv.created_at };
        }
      });

      const studentsWithStatus: Student[] = studentsList.map((student: any) => ({
        id: student.id,
        first_name: student.firstName ?? student.first_name ?? '',
        last_name: student.lastName ?? student.last_name ?? '',
        date_of_birth: toDateOnlyString(student.dateOfBirth ?? student.date_of_birth) || '',
        grade_level: student.gradeLevel ?? student.grade_level ?? null,
        school_name: student.school_name ?? null,
        school_id: student.school_id ?? student.schoolId ?? null,
        parent_id: '',
        created_at: student.createdAt ?? student.created_at ?? '',
        parent: undefined,
        documents: docsByStudent[student.id] || [],
        documentsCount: docCountsByStudent[student.id] || 0,
        hasLinkedParent: linkedStudentIds.has(student.id),
        latestInvite: invitesByStudent[student.id],
      }));

      setStudents(studentsWithStatus);
    } catch (error: any) {
      toastHook({
        variant: "destructive",
        title: "Error loading students",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          (student.parent?.full_name?.toLowerCase().includes(query) ?? false) ||
          (student.parent?.email?.toLowerCase().includes(query) ?? false)
      );
    }

    if (schoolFilter !== 'all') {
      filtered = filtered.filter((student) => student.school_id === schoolFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((student) => {
        const hasIncomplete = student.documents?.some((doc) => doc.status === 'pending');
        const hasExpired = student.documents?.some((doc) => doc.status === 'expired');

        if (statusFilter === 'complete') return !hasIncomplete && !hasExpired;
        if (statusFilter === 'incomplete') return hasIncomplete;
        if (statusFilter === 'expired') return hasExpired;
        return true;
      });
    }

    if (parentStatusFilter !== 'all') {
      filtered = filtered.filter((student) => {
        const parentStatus = getParentOnboardingStatus(student);
        if (parentStatusFilter === 'needs_invite') return parentStatus.type === 'needs_invite';
        if (parentStatusFilter === 'invite_pending') return parentStatus.type === 'invite_pending';
        if (parentStatusFilter === 'parent_linked') return parentStatus.type === 'parent_linked';
        if (parentStatusFilter === 'docs_received') return parentStatus.type === 'docs_received';
        return true;
      });
    }

    setFilteredStudents(filtered);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const first = editingStudent.first_name?.trim();
    const last = editingStudent.last_name?.trim();
    if (!first || !last) {
      toastHook({
        variant: 'destructive',
        title: 'Validation',
        description: 'First and last name are required.',
      });
      return;
    }
    if (!editingStudent.date_of_birth?.trim()) {
      toastHook({
        variant: 'destructive',
        title: 'Validation',
        description: 'Date of birth is required.',
      });
      return;
    }

    setSavingStudent(true);
    try {
      const normSchool = (v: string | null | undefined) =>
        v == null || v === '' || v === '_none_' ? null : v;
      const schoolNow = normSchool(editingStudent.school_id);
      const schoolWas = normSchool(editSchoolSnapshot);
      const schoolChanged = schoolNow !== schoolWas;

      const payload: Parameters<typeof studentProfileService.update>[1] = {
        firstName: first,
        lastName: last,
        dateOfBirth: editingStudent.date_of_birth.trim(),
        gradeLevel: editingStudent.grade_level?.trim() || null,
      };
      if (schoolChanged) {
        payload.schoolId = schoolNow;
      }

      await studentProfileService.update(editingStudent.id, payload);
      toastHook({
        title: 'Student updated',
        description: 'Profile changes have been saved.',
      });
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      await fetchStudents();
    } catch (error: unknown) {
      let message = 'Failed to update student';
      if (error instanceof ApiError) {
        const m = error.data?.message;
        message = Array.isArray(m) ? m.join(', ') : (typeof m === 'string' && m ? m : error.message);
      } else if (error instanceof Error) {
        message = error.message;
      }
      toastHook({
        variant: 'destructive',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setSavingStudent(false);
    }
  };

  const openAddStudentDialog = () => {
    const defaultSchool =
      viewerSchoolId ||
      (schoolsForAdd.length === 1 ? schoolsForAdd[0].id : '') ||
      schools[0]?.id ||
      '';
    setNewStudent({
      school_id: defaultSchool,
      first_name: '',
      last_name: '',
      date_of_birth: '',
      grade_level: '',
    });
    setIsAddDialogOpen(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.school_id?.trim()) {
      toastHook({
        variant: 'destructive',
        title: 'School required',
        description: 'Select which school this student is enrolled in.',
      });
      return;
    }
    const fn = newStudent.first_name?.trim();
    const ln = newStudent.last_name?.trim();
    if (!fn || !ln) {
      toastHook({
        variant: 'destructive',
        title: 'Name required',
        description: 'Enter first and last name.',
      });
      return;
    }
    if (!newStudent.date_of_birth?.trim()) {
      toastHook({
        variant: 'destructive',
        title: 'Date of birth required',
        description: 'Choose the student’s date of birth.',
      });
      return;
    }

    setAddSaving(true);
    try {
      await studentsService.create({
        first_name: fn,
        last_name: ln,
        date_of_birth: newStudent.date_of_birth.trim(),
        grade_level: newStudent.grade_level?.trim() || null,
        school_id: newStudent.school_id.trim(),
      });
      toastHook({
        title: 'Student added',
        description: 'The student profile was created. You can invite a parent from the list.',
      });
      setIsAddDialogOpen(false);
      await fetchStudents();
    } catch (error: unknown) {
      let message = 'Failed to add student';
      if (error instanceof ApiError) {
        const m = error.data?.message;
        message = Array.isArray(m) ? m.join(', ') : (typeof m === 'string' && m ? m : error.message);
      } else if (error instanceof Error) {
        message = error.message;
      }
      toastHook({
        variant: 'destructive',
        title: 'Could not add student',
        description: message,
      });
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    toastHook({
      variant: 'destructive',
      title: 'Removal not available here',
      description:
        `${student.first_name} ${student.last_name} is an enrolled profile, not a login account. Manage enrollment from your school tools.`,
    });
  };

  const openLinkParentDialog = async (student: Student) => {
    setLinkStudent(student);
    setSelectedParentId('');
    setRelation('');
    setIsLinkDialogOpen(true);
    setLoadingParents(true);

    try {
      const schoolScope = student.school_id || viewerSchoolId || undefined;
      const rows = await userService.list(
        schoolScope
          ? { role: 'PARENT', schoolId: schoolScope }
          : { role: 'PARENT' },
      );
      const parents = (Array.isArray(rows) ? rows : []).map((p: any) => ({
        id: String(p.id),
        name: String(p.full_name ?? p.name ?? '').trim() || 'Parent',
        email: String(p.email ?? '').trim(),
      }));
      setAvailableParents(parents);
    } catch (error: any) {
      setAvailableParents([]);
      toastHook({
        variant: 'destructive',
        title: 'Failed to load parents',
        description: error?.message ?? 'Could not load parent accounts',
      });
    } finally {
      setLoadingParents(false);
    }
  };

  const handleDirectParentLink = async () => {
    if (!linkStudent || !selectedParentId) {
      toastHook({
        variant: 'destructive',
        title: 'Select a parent',
        description: 'Pick an existing parent account to link.',
      });
      return;
    }

    setLinkingParent(true);
    try {
      await studentParentService.createLink({
        studentProfileId: linkStudent.id,
        parentId: selectedParentId,
        relation: relation.trim() || undefined,
        isPrimary: true,
      });
      toastHook({
        title: 'Parent linked',
        description: 'Parent was linked to student successfully.',
      });
      setIsLinkDialogOpen(false);
      setLinkStudent(null);
      await fetchStudents();
    } catch (error: any) {
      toastHook({
        variant: 'destructive',
        title: 'Failed to link parent',
        description: error?.message ?? 'Could not link parent to this student',
      });
    } finally {
      setLinkingParent(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {students.filter(s => {
                const status = getEnrollmentStatus(s);
                return status.label === 'Complete';
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {students.filter(s => {
                const status = getEnrollmentStatus(s);
                return status.label === 'Incomplete';
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired Docs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {students.filter(s => {
                const status = getEnrollmentStatus(s);
                return status.label === 'Expired Docs';
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Student Management</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openAddStudentDialog} size="sm" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Add student
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' && parentStatusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter('all'); setParentStatusFilter('all'); }}
              className="rounded-full"
            >
              All ({quickFilterCounts.all})
            </Button>
            <Button
              variant={statusFilter === 'complete' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter('complete'); setParentStatusFilter('all'); }}
              className="rounded-full"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              Complete ({quickFilterCounts.complete})
            </Button>
            <Button
              variant={statusFilter === 'incomplete' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter('incomplete'); setParentStatusFilter('all'); }}
              className="rounded-full"
            >
              Incomplete ({quickFilterCounts.incomplete})
            </Button>
            <Button
              variant={statusFilter === 'expired' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter('expired'); setParentStatusFilter('all'); }}
              className="rounded-full text-destructive border-destructive/30"
            >
              Expired ({quickFilterCounts.expired})
            </Button>
            <div className="w-px h-6 bg-border mx-1 self-center" />
            <Button
              variant={parentStatusFilter === 'needs_invite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setParentStatusFilter('needs_invite'); setStatusFilter('all'); }}
              className="rounded-full"
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Needs Invite ({quickFilterCounts.needsInvite})
            </Button>
            <Button
              variant={parentStatusFilter === 'invite_pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setParentStatusFilter('invite_pending'); setStatusFilter('all'); }}
              className="rounded-full"
            >
              Invite Pending ({quickFilterCounts.invitePending})
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, parent name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={parentStatusFilter} onValueChange={setParentStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Parent status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parent Status</SelectItem>
                  <SelectItem value="docs_received">Docs Received</SelectItem>
                  <SelectItem value="parent_linked">Parent Linked</SelectItem>
                  <SelectItem value="invite_pending">Invite Pending</SelectItem>
                  <SelectItem value="needs_invite">Needs Invite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          {hasActiveFilters && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" />
              Showing {filteredStudents.length} of {students.length} students
            </div>
          )}

          <div className="space-y-4">
            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No students found"
                description={
                  searchQuery || hasActiveFilters
                    ? 'Try adjusting your search or filters.'
                    : 'Add a student profile here, or parents can enroll through your school flow.'
                }
                action={
                  !searchQuery && !hasActiveFilters
                    ? { label: 'Add student', onClick: openAddStudentDialog }
                    : undefined
                }
              />
            ) : (
              filteredStudents.map((student) => {
                const status = getEnrollmentStatus(student);
                return (
                  <Card key={student.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {student.first_name} {student.last_name}
                            </h3>
                            <Badge variant={status.color as any}>{status.label}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>DOB: {formatDobForUi(student.date_of_birth)}</span>
                              {student.grade_level && <span>• Grade: {student.grade_level}</span>}
                            </div>
                            {student.school_name && (
                              <div className="flex items-center gap-2">
                                <SchoolIcon className="h-4 w-4" />
                                <span>{student.school_name}</span>
                              </div>
                            )}
                            <div>
                              <strong>Parent:</strong>{' '}
                              {student.parent ? (
                                <>
                                  {student.parent.full_name} ({student.parent.email})
                                  {student.parent.phone && <span> • {student.parent.phone}</span>}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Not linked — use Invite Parent</span>
                              )}
                            </div>
                            <div>
                              <strong>Documents:</strong> {student.documents?.length || 0} uploaded
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const parentStatus = getParentOnboardingStatus(student);

                            switch (parentStatus.type) {
                              case 'docs_received':
                                return (
                                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Docs received
                                  </Badge>
                                );

                              case 'parent_linked':
                                return (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Parent linked
                                  </Badge>
                                );

                              case 'invite_pending':
                                return (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">Invite pending</Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setInviteStudent(student);
                                        setIsInviteDialogOpen(true);
                                      }}
                                      disabled={!student.school_id}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Resend
                                    </Button>
                                  </div>
                                );

                              case 'needs_invite':
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setInviteStudent(student);
                                      setIsInviteDialogOpen(true);
                                    }}
                                    disabled={!student.school_id}
                                    title={!student.school_id ? "Student must be assigned to a school first" : ""}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Invite Parent
                                  </Button>
                                );
                            }
                          })()}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStudent(student);
                              setEditSchoolSnapshot(student.school_id ?? null);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleDeleteStudent(student)}
                            title="Block Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/student/${student.id}`)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Checklist
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLinkParentDialog(student)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Link Parent
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
            <DialogDescription>
              Creates an enrolled child profile for the selected school. Link or invite a parent afterward from the list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="space-y-2">
              <Label>School *</Label>
              <Select
                value={newStudent.school_id || '__none__'}
                onValueChange={(v) =>
                  setNewStudent((s) => ({ ...s, school_id: v === '__none__' ? '' : v }))
                }
                disabled={schoolsForAdd.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schoolsForAdd.length > 1 && (
                    <SelectItem value="__none__">Select school…</SelectItem>
                  )}
                  {schoolsForAdd.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolsForAdd.length === 0 && (
                <p className="text-xs text-muted-foreground">No schools available. Try again after schools load.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input
                  value={newStudent.first_name}
                  onChange={(e) => setNewStudent((s) => ({ ...s, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input
                  value={newStudent.last_name}
                  onChange={(e) => setNewStudent((s) => ({ ...s, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date of birth *</Label>
              <Input
                type="date"
                value={newStudent.date_of_birth}
                onChange={(e) => setNewStudent((s) => ({ ...s, date_of_birth: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Grade level</Label>
              <Input
                value={newStudent.grade_level}
                onChange={(e) => setNewStudent((s) => ({ ...s, grade_level: e.target.value }))}
                placeholder="e.g., Pre-K, Kindergarten"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? 'Adding…' : 'Add student'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Updates are saved to the student profile. Changing school or branch may require director or admin permissions.
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editingStudent.first_name}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editingStudent.last_name}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={editingStudent.date_of_birth}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, date_of_birth: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Input
                  value={editingStudent.grade_level || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, grade_level: e.target.value })
                  }
                  placeholder="e.g., Pre-K, Kindergarten, 1st Grade"
                />
              </div>
              <div className="space-y-2">
                <Label>School</Label>
                <Select
                  value={editingStudent.school_id || '_none_'}
                  onValueChange={(value) =>
                    setEditingStudent({ ...editingStudent, school_id: value === '_none_' ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">No School</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingStudent}>
                  {savingStudent ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Invite Dialog */}
      {inviteStudent && (
        <StudentInviteDialog
          isOpen={isInviteDialogOpen}
          onClose={() => {
            setIsInviteDialogOpen(false);
            setInviteStudent(null);
          }}
          student={inviteStudent}
          onSuccess={fetchStudents}
        />
      )}

      <Dialog
        open={isLinkDialogOpen}
        onOpenChange={(open) => {
          setIsLinkDialogOpen(open);
          if (!open) setLinkStudent(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Existing Parent</DialogTitle>
            <DialogDescription>
              {linkStudent
                ? `Assign an existing parent to ${linkStudent.first_name} ${linkStudent.last_name}.`
                : 'Assign an existing parent to this student.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Parent account</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId} disabled={loadingParents}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingParents ? 'Loading parents...' : 'Select parent'} />
                </SelectTrigger>
                <SelectContent>
                  {availableParents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingParents && availableParents.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No parent accounts found for this school. Add a parent in `/admin/parents` first.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Relation (optional)</Label>
              <Input
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Mother, Father, Guardian"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLinkDialogOpen(false);
                  setLinkStudent(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedParentId || linkingParent || loadingParents}
                onClick={handleDirectParentLink}
              >
                {linkingParent ? 'Linking…' : 'Link Parent'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AdminStudents;