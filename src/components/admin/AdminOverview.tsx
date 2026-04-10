import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { documentService } from '@/services/documentService';
import { analyticsService } from '@/services/analyticsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School, Users, FileText, UserCheck, Clock, CheckCircle, Shield, FolderOpen, Search, ChevronRight, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSchools();
    fetchStudentFiles();
    fetchTeacherFiles();
  }, []);

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

      const filesWithCounts = (students || []).map((student: any) => {
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

      const filesWithCounts = (teachers || []).map((teacher: any) => {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Platform Overview</h2>
        <p className="text-muted-foreground">
          Real-time statistics across the platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Schools</CardDescription>
              <School className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">{stats.totalSchools}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">
                {stats.approvedSchools} approved
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">
                {stats.pendingSchools} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Users</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across all schools and parents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Students</CardDescription>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">{stats.totalStudents}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enrolled across all schools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total Teachers</CardDescription>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">{stats.totalTeachers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>
      </div>

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
                        onClick={() => navigate(`/admin/student/${student.id}`)}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{student.last_name}, {student.first_name}</p>
                            <p className="text-xs text-muted-foreground">{student.school_name || 'No school assigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-sm font-medium">{student.document_count} docs</p>
                            {student.pending_count > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {student.pending_count} pending
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
                        onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{teacher.last_name}, {teacher.first_name}</p>
                            <p className="text-xs text-muted-foreground">{teacher.school_name || 'No school assigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-sm font-medium">{teacher.document_count} docs</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.pendingSchools > 0 && (
              <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate('/admin?tab=schools')}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                    <School className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.pendingSchools} Schools Awaiting Approval</p>
                    <p className="text-sm text-muted-foreground">Review pending registrations</p>
                  </div>
                </div>
              </div>
            )}
            
            {stats.pendingDocuments > 0 && (
              <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate('/admin?tab=documents')}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.pendingDocuments} Documents to Review</p>
                    <p className="text-sm text-muted-foreground">Approve or reject submissions</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate('/admin/audit-logs')}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Audit Logs</p>
                  <p className="text-sm text-muted-foreground">View authentication & system events</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate('/compliance')}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Compliance Dashboard</p>
                  <p className="text-sm text-muted-foreground">DOH compliance overview</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TeacherExpirationAlerts />
    </div>
  );
};

export default AdminOverview;
