import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { documentService } from '@/services/documentService';
import { analyticsService } from '@/services/analyticsService';
import { auditService } from '@/services/auditService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  School, Users, FileText, UserCheck, Clock, CheckCircle, 
  Shield, FolderOpen, Search, ChevronRight, ChevronDown, 
  ChevronUp, GraduationCap, Trash2, ShieldAlert, Activity,
  UserPlus as UserPlusIcon, Upload, AlertCircle, Info, Settings 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TeacherExpirationAlerts from './TeacherExpirationAlerts';
import { StatsGridSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PlatformStats {
  totalSchools: number;
  pendingSchools: number;
  approvedSchools: number;
  totalUsers: number;
  totalDocuments: number;
  pendingDocuments: number;
  totalStudents: number;
  totalTeachers: number;
}

interface SchoolOption {
  id: string;
  name: string;
}

interface StudentFile {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string | null;
  school_name: string | null;
  document_count: number;
  pending_count: number;
}

interface TeacherFile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: string | null;
  school_name: string | null;
  document_count: number;
}

interface AuditEvent {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  } | null;
}

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalSchools: 0,
    pendingSchools: 0,
    approvedSchools: 0,
    totalUsers: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
  const [teacherFiles, setTeacherFiles] = useState<TeacherFile[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [studentSchoolFilter, setStudentSchoolFilter] = useState<string>('all');
  const [teacherSchoolFilter, setTeacherSchoolFilter] = useState<string>('all');
  const [studentSort, setStudentSort] = useState<string>('name-asc');
  const [teacherSort, setTeacherSort] = useState<string>('name-asc');
  const [studentFilesOpen, setStudentFilesOpen] = useState(true);
  const [teacherFilesOpen, setTeacherFilesOpen] = useState(true);
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSchools();
    fetchStudentFiles();
    fetchTeacherFiles();
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setActivityLoading(true);
      const data = await auditService.list({ limit: 8 });
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await analyticsService.getDashboard();
      setStats({
        totalSchools: data.totalSchools ?? 0,
        pendingSchools: data.pendingSchools ?? 0,
        approvedSchools: data.approvedSchools ?? 0,
        totalUsers: data.totalUsers ?? 0,
        totalDocuments: data.totalDocuments ?? 0,
        pendingDocuments: data.pendingDocuments ?? 0,
        totalStudents: data.totalStudents ?? 0,
        totalTeachers: data.totalTeachers ?? 0,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load statistics',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const data = await schoolService.list();
      setSchools(data || []);
    } catch (error: any) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchStudentFiles = async () => {
    try {
      const [students, documents] = await Promise.all([
        userService.list({ role: 'STUDENT' }),
        documentService.search(),
      ]);

      // Filter out deleted students if any (though backend usually filters them)
      const activeStudents = (students || []).filter((s: any) => !s.deleted_at);

      const filesWithCounts = activeStudents.map((student: any) => {
        const studentDocs = (documents || []).filter((d: any) => d.student_id === student.id);
        return {
          ...student,
          document_count: studentDocs.length,
          pending_count: studentDocs.filter((d: any) => d.status === 'pending').length,
        };
      });

      setStudentFiles(filesWithCounts);
    } catch (error: any) {
      console.error('Error fetching student files:', error);
    }
  };

  const fetchTeacherFiles = async () => {
    try {
      const [teachers, teacherDocs, schoolsList] = await Promise.all([
        userService.list({ role: 'TEACHER' }),
        documentService.search(),
        schoolService.list(),
      ]);

      const schoolMap = new Map((schoolsList || []).map((s: any) => [s.id, s.name]));
      const activeTeachers = (teachers || []).filter((t: any) => !t.deleted_at);

      const filesWithCounts = activeTeachers.map((teacher: any) => {
        const docs = (teacherDocs || []).filter((d: any) => d.teacher_id === teacher.id);
        return {
          ...teacher,
          school_name: teacher.school_id ? schoolMap.get(teacher.school_id) || null : null,
          document_count: docs.length,
        };
      });

      setTeacherFiles(filesWithCounts);
    } catch (error: any) {
      console.error('Error fetching teacher files:', error);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to block/delete ${name}? This will prevent them from logging in.`)) return;
    try {
      await userService.remove(id);
      toast({
        title: "User blocked",
        description: `${name} has been removed from active view.`,
      });
      fetchStudentFiles();
      fetchTeacherFiles();
      fetchStats();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Deletion failed",
        description: error.message,
      });
    }
  };

  const filteredStudentFiles = studentFiles
    .filter(student => {
      const matchesSearch = `${student.first_name} ${student.last_name}`.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        (student.school_name?.toLowerCase().includes(studentSearchQuery.toLowerCase()));
      const matchesSchool = studentSchoolFilter === 'all' || student.school_id === studentSchoolFilter;
      return matchesSearch && matchesSchool;
    })
    .sort((a, b) => {
      switch (studentSort) {
        case 'name-asc':
          return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
        case 'name-desc':
          return `${b.last_name} ${b.first_name}`.localeCompare(`${a.last_name} ${a.first_name}`);
        case 'docs-asc':
          return a.document_count - b.document_count;
        case 'docs-desc':
          return b.document_count - a.document_count;
        case 'pending-desc':
          return b.pending_count - a.pending_count;
        case 'pending-asc':
          return a.pending_count - b.pending_count;
        default:
          return 0;
      }
    });

  const filteredTeacherFiles = teacherFiles
    .filter(teacher => {
      const matchesSearch = `${teacher.first_name} ${teacher.last_name}`.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        (teacher.school_name?.toLowerCase().includes(teacherSearchQuery.toLowerCase()));
      const matchesSchool = teacherSchoolFilter === 'all' || teacher.school_id === teacherSchoolFilter;
      return matchesSearch && matchesSchool;
    })
    .sort((a, b) => {
      switch (teacherSort) {
        case 'name-asc':
          return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
        case 'name-desc':
          return `${b.last_name} ${b.first_name}`.localeCompare(`${a.last_name} ${a.first_name}`);
        case 'docs-asc':
          return a.document_count - b.document_count;
        case 'docs-desc':
          return b.document_count - a.document_count;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Platform Overview</h2>
          <p className="text-muted-foreground">
            Real-time statistics across the platform
          </p>
        </div>
        <StatsGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          Global Command Center
        </h2>
        <p className="text-muted-foreground font-medium">
          Analytics and oversight across the SCP ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Schools</CardDescription>
              <div className="p-2 rounded-full bg-primary/10">
                <School className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalSchools}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">
                {stats.approvedSchools} approved
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">
                {stats.pendingSchools} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 hover:border-primary/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Users</CardDescription>
              <div className="p-2 rounded-full bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total platform accounts
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 hover:border-primary/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Students</CardDescription>
              <div className="p-2 rounded-full bg-purple-500/10">
                <UserCheck className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalStudents}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Linked student profiles
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 hover:border-primary/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Teachers</CardDescription>
              <div className="p-2 rounded-full bg-emerald-500/10">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalTeachers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Student Files Section */}
      <Card>
        <Collapsible open={studentFilesOpen} onOpenChange={setStudentFilesOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Student Files</CardTitle>
                    <CardDescription>All documents organized within student files</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{studentFiles.length} files</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {studentFilesOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student files..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={studentSchoolFilter} onValueChange={setStudentSchoolFilter}>
                  <SelectTrigger className="w-[160px]">
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
                <Select value={studentSort} onValueChange={setStudentSort}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="docs-desc">Most Docs</SelectItem>
                    <SelectItem value="docs-asc">Least Docs</SelectItem>
                    <SelectItem value="pending-desc">Most Pending</SelectItem>
                    <SelectItem value="pending-asc">Least Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {filteredStudentFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No student files found</p>
                  ) : (
                    filteredStudentFiles.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 group relative"
                      >
                        <div className="flex items-center gap-3 flex-1" onClick={() => navigate(`/admin/student/${student.id}`)}>
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student.last_name}, {student.first_name}</p>
                            <p className="text-xs text-muted-foreground">{student.school_name || 'No school assigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right mr-2" onClick={() => navigate(`/admin/student/${student.id}`)}>
                            <p className="text-sm font-medium">{student.document_count} docs</p>
                            {student.pending_count > 0 && (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">
                                {student.pending_count} pending
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(student.id, `${student.first_name} ${student.last_name}`);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Teacher Files Section */}
      <Card>
        <Collapsible open={teacherFilesOpen} onOpenChange={setTeacherFilesOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Teacher Files</CardTitle>
                    <CardDescription>Staff documents and certifications</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{teacherFiles.length} files</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {teacherFilesOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teacher files..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={teacherSchoolFilter} onValueChange={setTeacherSchoolFilter}>
                  <SelectTrigger className="w-[160px]">
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
                <Select value={teacherSort} onValueChange={setTeacherSort}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="docs-desc">Most Docs</SelectItem>
                    <SelectItem value="docs-asc">Least Docs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {filteredTeacherFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No teacher files found</p>
                  ) : (
                    filteredTeacherFiles.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 group relative"
                      >
                        <div className="flex items-center gap-3 flex-1" onClick={() => navigate(`/admin/teacher/${teacher.id}`)}>
                          <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{teacher.last_name}, {teacher.first_name}</p>
                            <p className="text-xs text-muted-foreground">{teacher.school_name || 'No school assigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right mr-2" onClick={() => navigate(`/admin/teacher/${teacher.id}`)}>
                            <p className="text-sm font-medium">{teacher.document_count} docs</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(teacher.id, `${teacher.first_name} ${teacher.last_name}`);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Quick Actions */}
      <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Platform governance and system utilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.pendingSchools > 0 && (
              <div 
                className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 cursor-pointer transition-all duration-200 shadow-sm"
                onClick={() => navigate('/admin?tab=schools')}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shadow-inner">
                    <School className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">{stats.pendingSchools} Schools Awaiting Approval</p>
                    <p className="text-sm text-amber-700/80 dark:text-amber-300/80">Action required: Critical</p>
                  </div>
                </div>
              </div>
            )}
            
            <div 
              className="p-4 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 shadow-sm"
              onClick={() => navigate('/admin?tab=documents')}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-inner">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{stats.pendingDocuments} Documents Pending</p>
                  <p className="text-sm text-muted-foreground">Global verification queue</p>
                </div>
              </div>
            </div>

            <div 
              className="p-4 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 shadow-sm"
              onClick={() => navigate('/compliance')}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shadow-inner">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Compliance Hub</p>
                  <p className="text-sm text-muted-foreground">Overall system health</p>
                </div>
              </div>
            </div>

            <div 
              className="p-4 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 shadow-sm"
              onClick={() => navigate('/admin/settings')}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shadow-inner">
                  <ShieldAlert className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Security Settings</p>
                  <p className="text-sm text-muted-foreground">Manage roles & access</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        </div>

        {/* Right Sidebar - Activity Feed */}
        <div className="space-y-6">
          <Card className="h-full backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-border/10">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
              <CardDescription>Latest system-wide events</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[730px]">
                <div className="p-4 space-y-6">
                  {activityLoading ? (
                    [...Array(6)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                          <div className="h-2 w-1/2 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No recent activity detected</p>
                    </div>
                  ) : (
                    recentActivity.map((event, i) => {
                      const Icon = getActivityIcon(event.action);
                      const color = getActivityColor(event.action);
                      return (
                        <div key={event.id} className="relative flex gap-4 group">
                          {i !== recentActivity.length - 1 && (
                            <div className="absolute left-4 top-8 bottom-[-24px] w-[1px] bg-border/30 group-hover:bg-primary/20 transition-colors" />
                          )}
                          <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm z-10 transition-transform group-hover:scale-110`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <p className="text-sm font-medium leading-tight">
                              {event.user?.full_name || 'System'} {formatAction(event.action)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • {new Date(event.created_at).toLocaleDateString()}
                            </p>
                            {event.details && (
                              <p className="text-[10px] text-muted-foreground/60 italic font-mono mt-1 break-all line-clamp-1 group-hover:line-clamp-none transition-all">
                                {typeof event.details === 'string' ? event.details : JSON.stringify(event.details)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border/10 bg-muted/20">
                <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => navigate('/admin/audit-logs')}>
                  View Full Audit Log
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TeacherExpirationAlerts />
    </div>
  );
};

// Helper components for Activity Feed
const getActivityIcon = (action: string) => {
  if (action.includes('create')) return UserPlusIcon;
  if (action.includes('update')) return Info;
  if (action.includes('delete') || action.includes('remove')) return Trash2;
  if (action.includes('upload')) return Upload;
  if (action.includes('approve') || action.includes('accept')) return CheckCircle;
  if (action.includes('reject') || action.includes('fail')) return AlertCircle;
  if (action.includes('login')) return Shield;
  if (action.includes('settings')) return Settings;
  return Activity;
};

const getActivityColor = (action: string) => {
  if (action.includes('create') || action.includes('upload')) return 'bg-blue-500/10 text-blue-500';
  if (action.includes('approve') || action.includes('accept') || action.includes('success')) return 'bg-emerald-500/10 text-emerald-500';
  if (action.includes('delete') || action.includes('remove') || action.includes('reject') || action.includes('fail')) return 'bg-rose-500/10 text-rose-500';
  if (action.includes('login') || action.includes('auth')) return 'bg-purple-500/10 text-purple-500';
  return 'bg-amber-500/10 text-amber-500';
};

const formatAction = (action: string) => {
  return action.replace(/_/g, ' ').replace(/\./g, ' ');
};

export default AdminOverview;
