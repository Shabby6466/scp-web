import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { toast as toastHook } from '@/hooks/use-toast';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { invitationService } from '@/services/invitationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit, FileText, Calendar, School as SchoolIcon, GraduationCap, Mail, CheckCircle, UserCheck, RefreshCw, X, Filter, Trash2 } from 'lucide-react';
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
      const studentsList = await userService.list({ role: 'STUDENT' }) || [];
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
        if (!doc.student_id || !studentIds.includes(doc.student_id)) return;
        if (!docsByStudent[doc.student_id]) {
          docsByStudent[doc.student_id] = [];
          docCountsByStudent[doc.student_id] = 0;
        }
        docsByStudent[doc.student_id].push({ id: doc.id, category: doc.category, status: doc.status });
        docCountsByStudent[doc.student_id]++;
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
        if (inv.student_id && !invitesByStudent[inv.student_id]) {
          invitesByStudent[inv.student_id] = { status: inv.status, created_at: inv.created_at };
        }
      });

      const studentsWithStatus: Student[] = studentsList.map((student: any) => ({
        ...student,
        parent: Array.isArray(student.parent) ? student.parent[0] : student.parent,
        documents: docsByStudent[student.id] || [],
        documentsCount: docCountsByStudent[student.id] || 0,
        hasLinkedParent: linkedStudentIds.has(student.id),
        latestInvite: invitesByStudent[student.id]
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
          student.parent?.full_name.toLowerCase().includes(query) ||
          student.parent?.email.toLowerCase().includes(query)
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

    try {
      await userService.update(editingStudent.id, {
        first_name: editingStudent.first_name,
        last_name: editingStudent.last_name,
        date_of_birth: editingStudent.date_of_birth,
        grade_level: editingStudent.grade_level,
        school_id: editingStudent.school_id,
        school_name: schools.find(s => s.id === editingStudent.school_id)?.name || null,
      });

      toastHook({
        title: "Student updated",
        description: "Student information has been updated successfully.",
      });

      setIsEditDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toastHook({
        variant: "destructive",
        title: "Error updating student",
        description: error.message,
      });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to block/delete ${student.first_name} ${student.last_name}? This will prevent them from logging in.`)) return;
    try {
      await userService.remove(student.id);
      toastHook({
        title: "Student blocked",
        description: "Student has been removed from active view.",
      });
      fetchStudents();
    } catch (error: any) {
      toastHook({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message,
      });
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
          <div className="flex items-center justify-between">
            <CardTitle>Student Management</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
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
                description={searchQuery ? "Try adjusting your search or filters" : "Students will appear here once parents register them"}
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
                              <span>DOB: {new Date(student.date_of_birth).toLocaleDateString()}</span>
                              {student.grade_level && <span>• Grade: {student.grade_level}</span>}
                            </div>
                            {student.school_name && (
                              <div className="flex items-center gap-2">
                                <SchoolIcon className="h-4 w-4" />
                                <span>{student.school_name}</span>
                              </div>
                            )}
                            <div>
                              <strong>Parent:</strong> {student.parent?.full_name} ({student.parent?.email})
                              {student.parent?.phone && <span> • {student.parent.phone}</span>}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
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
                <Button type="submit">Save Changes</Button>
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
    </div>
  );
}
export default AdminStudents;