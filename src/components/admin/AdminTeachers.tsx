import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { schoolService } from '@/services/schoolService';
import { branchService } from '@/services/branchService';
import { userService } from '@/services/userService';
import { documentService } from '@/services/documentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Edit, FileText, AlertTriangle, CheckCircle, Calendar, Mail, Phone, School as SchoolIcon, Upload, Users, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import TeacherDocumentUpload from './TeacherDocumentUpload';
import TeacherDocumentsList from './TeacherDocumentsList';
import TeacherExpirationAlerts from './TeacherExpirationAlerts';
import TeacherInviteDialog from './TeacherInviteDialog';
import PendingTeacherInvitations from './PendingTeacherInvitations';

interface Teacher {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  hire_date: string | null;
  certification_type: string | null;
  certification_expiry: string | null;
  background_check_date: string | null;
  background_check_expiry: string | null;
  employment_status: string;
  notes: string | null;
  created_at: string;
  school?: {
    name: string;
  };
  documents?: Array<{
    id: string;
    document_type: string;
    expiration_date: string | null;
  }>;
}

interface School {
  id: string;
  name: string;
}
interface BranchOption {
  id: string;
  name: string;
}

function isoDateOnly(v: unknown): string | null {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/** DB uses ACTIVE / ON_LEAVE; filters + badges use lowercase snake. */
function mapEmploymentToUi(raw: unknown): string {
  if (raw == null || raw === '') return 'active';
  const k = String(raw).toUpperCase().replace(/-/g, '_');
  if (k === 'ACTIVE') return 'active';
  if (k === 'INACTIVE') return 'inactive';
  if (k === 'ON_LEAVE') return 'on_leave';
  if (k === 'TERMINATED') return 'inactive';
  return 'active';
}

/** Nest returns `name`, `schoolId`, nested `teacherProfile` — align with this UI model. */
function normalizeTeacherRow(raw: Record<string, any>, schoolMap: Map<string, string>): Teacher {
  const tp = raw.teacherProfile ?? raw.teacher_profile;
  const sid = raw.school_id ?? raw.schoolId ?? '';
  const full = String(raw.name ?? '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const first_name =
    raw.first_name ?? raw.firstName ?? (parts[0] ?? '');
  const last_name =
    raw.last_name ?? raw.lastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : '');

  return {
    id: raw.id,
    school_id: sid,
    first_name,
    last_name,
    email: raw.email ?? '',
    phone: (tp?.phone ?? raw.phone) ?? null,
    hire_date: isoDateOnly(tp?.hireDate ?? tp?.hire_date),
    certification_type: tp?.certificationType ?? tp?.certification_type ?? null,
    certification_expiry: isoDateOnly(tp?.certificationExpiry ?? tp?.certification_expiry),
    background_check_date: isoDateOnly(tp?.backgroundCheckDate ?? tp?.background_check_date),
    background_check_expiry: isoDateOnly(tp?.backgroundCheckExpiry ?? tp?.background_check_expiry),
    employment_status: mapEmploymentToUi(tp?.employmentStatus ?? tp?.employment_status),
    notes: tp?.notes ?? null,
    created_at: raw.created_at ?? raw.createdAt ?? '',
    school: sid ? { name: schoolMap.get(sid) || raw.school?.name || '' } : undefined,
    documents: raw.documents,
  };
}

const AdminTeachers = () => {
  const navigate = useNavigate();
  const {
    schoolId: viewerSchoolId,
    branchId: viewerBranchId,
    isBranchDirector,
  } = useUserRole();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDocsListOpen, setIsDocsListOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; name: string; schoolId: string } | null>(null);
  const [newTeacher, setNewTeacher] = useState({
    school_id: '',
    branch_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    hire_date: '',
    certification_type: '',
    certification_expiry: '',
    employment_status: 'active',
  });
  const [createMode, setCreateMode] = useState<'otp' | 'manual'>('otp');
  const [manualPassword, setManualPassword] = useState('');

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [viewerSchoolId, viewerBranchId, isBranchDirector]);

  useEffect(() => {
    const sid = newTeacher.school_id || viewerSchoolId || '';
    if (!sid) {
      setBranches([]);
      return;
    }
    void (async () => {
      try {
        const data = await branchService.listBySchool(sid);
        const list = Array.isArray(data) ? data : [];
        setBranches(list);
        if (list.length === 1) {
          const forced = isBranchDirector && viewerBranchId ? viewerBranchId : list[0].id;
          setNewTeacher((t) => (t.branch_id === forced ? t : { ...t, branch_id: forced }));
        }
      } catch {
        setBranches([]);
      }
    })();
  }, [newTeacher.school_id, viewerSchoolId, isBranchDirector, viewerBranchId]);

  useEffect(() => {
    applyFilters();
  }, [teachers, searchQuery, schoolFilter, statusFilter]);

  const fetchSchools = async () => {
    try {
      const data = await schoolService.list();
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const listParams = viewerSchoolId
        ? {
            role: 'TEACHER' as const,
            schoolId: viewerSchoolId,
            ...(isBranchDirector && viewerBranchId
              ? { branchId: viewerBranchId }
              : {}),
          }
        : { role: 'TEACHER' as const };
      const teachersList = await userService.list(listParams);
      const [allDocs, schoolsList] = await Promise.all([
        documentService.search(
          viewerSchoolId
            ? {
                schoolId: viewerSchoolId,
                ...(viewerBranchId && isBranchDirector
                  ? { branchId: viewerBranchId }
                  : {}),
              }
            : undefined,
        ),
        schoolService.list(),
      ]);

      const schoolMap = new Map((schoolsList || []).map((s: any) => [s.id, s.name]));

      const teachersWithDocs = (teachersList || []).map((teacher: any) => {
        const row = normalizeTeacherRow(teacher, schoolMap);
        const docs = (allDocs || []).filter(
          (d: any) =>
            d.teacher_id === teacher.id ||
            d.teacherId === teacher.id ||
            d.owner_user_id === teacher.id ||
            d.ownerUserId === teacher.id,
        );
        return { ...row, documents: docs };
      });

      setTeachers(teachersWithDocs);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading teachers",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...teachers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((teacher) => {
        const nameHay = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
        const schoolHay = (teacher.school?.name ?? '').toLowerCase();
        return (
          nameHay.includes(query) ||
          teacher.email.toLowerCase().includes(query) ||
          schoolHay.includes(query)
        );
      });
    }

    if (schoolFilter !== 'all') {
      filtered = filtered.filter((teacher) => teacher.school_id === schoolFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((teacher) => teacher.employment_status === statusFilter);
    }

    setFilteredTeachers(filtered);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (createMode === 'manual' && manualPassword.trim().length < 8) {
        toast({
          variant: "destructive",
          title: "Password required",
          description: "Manual mode needs a password with at least 8 characters.",
        });
        return;
      }
      if (!newTeacher.school_id?.trim()) {
        toast({
          variant: 'destructive',
          title: 'School required',
          description: 'Select which school this teacher belongs to.',
        });
        return;
      }
      if (branches.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Branch required',
          description:
            'This school has no branches yet. Create at least one branch before adding teachers.',
        });
        return;
      }
      const effectiveBranchId =
        isBranchDirector && viewerBranchId ? viewerBranchId : newTeacher.branch_id?.trim() || '';
      if (!effectiveBranchId) {
        toast({
          variant: 'destructive',
          title: 'Branch required',
          description: 'Select which branch this teacher is assigned to.',
        });
        return;
      }
      const payload: Record<string, unknown> = {
        ...newTeacher,
        role: 'TEACHER',
        branch_id: effectiveBranchId,
      };
      if (createMode === 'manual') {
        payload.password = manualPassword.trim();
      }
      await userService.create(payload);

      toast({
        title: "Teacher added",
        description:
          createMode === 'manual'
            ? "Teacher added with manual password."
            : "Teacher added. OTP invite sent (if enabled).",
      });

      setIsAddDialogOpen(false);
      setNewTeacher({
        school_id: '',
        branch_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        hire_date: '',
        certification_type: '',
        certification_expiry: '',
        employment_status: 'active',
      });
      setCreateMode('otp');
      setManualPassword('');
      fetchTeachers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding teacher",
        description: error.message,
      });
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      await userService.update(editingTeacher.id, {
        first_name: editingTeacher.first_name,
        last_name: editingTeacher.last_name,
        email: editingTeacher.email,
        phone: editingTeacher.phone,
        hire_date: editingTeacher.hire_date,
        certification_type: editingTeacher.certification_type,
        certification_expiry: editingTeacher.certification_expiry,
        background_check_date: editingTeacher.background_check_date,
        background_check_expiry: editingTeacher.background_check_expiry,
        employment_status: editingTeacher.employment_status,
        notes: editingTeacher.notes,
      });

      toast({
        title: "Teacher updated",
        description: "Teacher information has been updated successfully.",
      });

      setIsEditDialogOpen(false);
      fetchTeachers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating teacher",
        description: error.message,
      });
    }
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`Are you sure you want to block/delete ${teacher.first_name} ${teacher.last_name}? This will prevent them from logging in.`)) return;
    try {
      await userService.remove(teacher.id);
      toast({
        title: "Teacher blocked",
        description: "Teacher has been removed from active view.",
      });
      fetchTeachers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message,
      });
    }
  };

  const openAddTeacherDialog = () => {
    setNewTeacher((prev) => ({
      ...prev,
      school_id: viewerSchoolId ?? prev.school_id ?? '',
      branch_id:
        isBranchDirector && viewerBranchId
          ? viewerBranchId
          : prev.branch_id ?? '',
    }));
    setIsAddDialogOpen(true);
  };

  const getComplianceStatus = (teacher: Teacher) => {
    const today = new Date();
    const certExpiry = teacher.certification_expiry ? new Date(teacher.certification_expiry) : null;
    const bgExpiry = teacher.background_check_expiry ? new Date(teacher.background_check_expiry) : null;

    if (!certExpiry || !bgExpiry) {
      return { label: 'Incomplete', color: 'destructive', icon: AlertTriangle };
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (certExpiry < today || bgExpiry < today) {
      return { label: 'Expired', color: 'destructive', icon: AlertTriangle };
    }

    if (certExpiry < thirtyDaysFromNow || bgExpiry < thirtyDaysFromNow) {
      return { label: 'Expiring Soon', color: 'secondary', icon: AlertTriangle };
    }

    return { label: 'Compliant', color: 'default', icon: CheckCircle };
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
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48 mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-primary/20">
      <TeacherExpirationAlerts />
      
      <PendingTeacherInvitations onInvitationChange={fetchTeachers} />
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {teachers.filter((t) => t.employment_status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {teachers.filter((t) => getComplianceStatus(t).label === 'Compliant').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {teachers.filter((t) => {
                const status = getComplianceStatus(t);
                return status.label === 'Expired' || status.label === 'Incomplete';
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Teacher Management</CardTitle>
          <div className="flex gap-2">
            <TeacherInviteDialog onInviteSent={fetchTeachers} />
            <Button onClick={openAddTeacherDialog} variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or school..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredTeachers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No teachers found"
                description={searchQuery ? "Try adjusting your search or filters" : "Add your first teacher to get started"}
                action={{ label: "Add Teacher", onClick: openAddTeacherDialog }}
              />
            ) : (
              filteredTeachers.map((teacher) => {
                const compliance = getComplianceStatus(teacher);
                const ComplianceIcon = compliance.icon;
                return (
                  <Card key={teacher.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">
                              {teacher.first_name} {teacher.last_name}
                            </h3>
                            <Badge variant={compliance.color as any}>
                              <ComplianceIcon className="h-3 w-3 mr-1" />
                              {compliance.label}
                            </Badge>
                            <Badge variant={teacher.employment_status === 'active' ? 'default' : 'secondary'}>
                              {teacher.employment_status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <SchoolIcon className="h-4 w-4" />
                              <span>{teacher.school?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{teacher.email}</span>
                            </div>
                            {teacher.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{teacher.phone}</span>
                              </div>
                            )}
                            {teacher.hire_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Hired: {new Date(teacher.hire_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {teacher.certification_type && (
                              <div>
                                <strong>Certification:</strong> {teacher.certification_type}
                                {teacher.certification_expiry && ` (Expires: ${new Date(teacher.certification_expiry).toLocaleDateString()})`}
                              </div>
                            )}
                            {teacher.background_check_expiry && (
                              <div>
                                <strong>Background Check:</strong> Expires {new Date(teacher.background_check_expiry).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTeacher(teacher);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Checklist
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleDeleteTeacher(teacher)}
                            title="Block Teacher"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTeacher({
                                id: teacher.id,
                                name: `${teacher.first_name} ${teacher.last_name}`,
                                schoolId: teacher.school_id
                              });
                              setIsUploadDialogOpen(true);
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
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

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Create a teacher account for the selected school. They will appear in compliance and roster tools.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="space-y-2">
              <Label>School *</Label>
              <Select
                value={newTeacher.school_id}
                onValueChange={(value: string) =>
                  setNewTeacher({
                    ...newTeacher,
                    school_id: value,
                    branch_id: isBranchDirector && viewerBranchId ? viewerBranchId : '',
                  })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={newTeacher.branch_id || undefined}
                onValueChange={(value: string) =>
                  setNewTeacher({
                    ...newTeacher,
                    branch_id: value,
                  })
                }
                disabled={
                  (isBranchDirector && !!viewerBranchId) ||
                  !newTeacher.school_id?.trim() ||
                  branches.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !newTeacher.school_id?.trim()
                        ? 'Select a school first'
                        : branches.length === 0
                          ? 'No branches — add one in school settings'
                          : 'Select branch'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={newTeacher.first_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={newTeacher.last_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account setup mode</Label>
              <Select value={createMode} onValueChange={(v: 'otp' | 'manual') => setCreateMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otp">OTP invite (user sets password)</SelectItem>
                  <SelectItem value="manual">Manual password</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createMode === 'manual' && (
              <div className="space-y-2">
                <Label>Temporary password *</Label>
                <Input
                  type="password"
                  value={manualPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={newTeacher.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Input
                  type="date"
                  value={newTeacher.hire_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, hire_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Certification Type</Label>
                <Input
                  value={newTeacher.certification_type}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, certification_type: e.target.value })}
                  placeholder="e.g., Early Childhood Education"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Certification Expiry</Label>
              <Input
                type="date"
                value={newTeacher.certification_expiry}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeacher({ ...newTeacher, certification_expiry: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Teacher</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update this staff member&apos;s profile and HR fields. Changes apply to compliance tracking.
            </DialogDescription>
          </DialogHeader>
          {editingTeacher && (
            <form onSubmit={handleUpdateTeacher} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editingTeacher.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editingTeacher.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingTeacher.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={editingTeacher.phone || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hire Date</Label>
                  <Input
                    type="date"
                    value={editingTeacher.hire_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, hire_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select
                    value={editingTeacher.employment_status}
                    onValueChange={(value: string) =>
                      setEditingTeacher({ ...editingTeacher, employment_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Certification Type</Label>
                  <Input
                    value={editingTeacher.certification_type || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, certification_type: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Certification Expiry</Label>
                  <Input
                    type="date"
                    value={editingTeacher.certification_expiry || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, certification_expiry: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Background Check Date</Label>
                  <Input
                    type="date"
                    value={editingTeacher.background_check_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, background_check_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Background Check Expiry</Label>
                  <Input
                    type="date"
                    value={editingTeacher.background_check_expiry || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeacher({ ...editingTeacher, background_check_expiry: e.target.value })
                    }
                  />
                </div>
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

      {/* Document Upload Dialog */}
      {selectedTeacher && (
        <TeacherDocumentUpload
          teacherId={selectedTeacher.id}
          schoolId={selectedTeacher.schoolId}
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          onUploadComplete={() => {
            fetchTeachers();
          }}
        />
      )}

      {/* Documents List Dialog */}
      {selectedTeacher && (
        <TeacherDocumentsList
          teacherId={selectedTeacher.id}
          teacherName={selectedTeacher.name}
          open={isDocsListOpen}
          onOpenChange={setIsDocsListOpen}
          onDocumentsChange={() => {
            fetchTeachers();
          }}
        />
      )}
    </div>
  );
};

export default AdminTeachers;