import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { branchService } from '@/services/branchService';
import { invitationService } from '@/services/invitationService';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, GraduationCap, CheckCircle, AlertCircle, 
  Mail, Send, Loader2, MapPin, FileText
} from 'lucide-react';

interface ImportJob {
  id: string;
  school_id: string;
  branch_id: string | null;
  file_name: string;
  status: string;
  total_rows: number;
  created_students: number;
  updated_students: number;
  created_parents: number;
  matched_parents: number;
  linked_relationships: number;
  error_count: number;
  created_at: string;
  completed_at: string | null;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade_level: string | null;
  branch_id: string | null;
  school_id: string | null;
  created_at: string;
  parent?: {
    id: string;
    full_name: string;
    email: string;
  };
  hasInvitation?: boolean;
}

interface Branch {
  id: string;
  branch_name: string;
}

const ImportReviewPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageSchool, isDirector, branchId: userBranchId } = useUserRole();
  const { toast } = useToast();

  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);
  const [updatingBranch, setUpdatingBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageSchool && !isDirector) {
      navigate('/not-authorized');
      return;
    }
    if (jobId) {
      fetchImportData();
    }
  }, [jobId, canManageSchool, isDirector]);

  const fetchImportData = async () => {
    if (!jobId) return;

    try {
      const job = await api.get(`/roster/import-jobs/${jobId}`);
      setImportJob(job);

      const branchesData = await branchService.listBySchool(job.school_id);
      setBranches(branchesData || []);

      const studentsData = await api.get(`/roster/import-jobs/${jobId}/students`);

      const formattedStudents = (studentsData || []).map((student: any) => ({
        ...student,
        parent: Array.isArray(student.parent) ? student.parent[0] : student.parent,
        hasInvitation: student.hasInvitation || false,
      }));

      setStudents(formattedStudents);
    } catch (error: any) {
      console.error('Error fetching import data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading import data',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const uninvitedStudents = students
        .filter(s => !s.hasInvitation && s.parent?.email)
        .map(s => s.id);
      setSelectedStudents(new Set(uninvitedStudents));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleBranchChange = async (studentId: string, branchId: string) => {
    setUpdatingBranch(studentId);
    try {
      await api.patch(`/students/${studentId}`, { branch_id: branchId || null });

      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, branch_id: branchId || null } : s
      ));

      toast({ title: 'Branch updated' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update branch',
        description: error.message
      });
    } finally {
      setUpdatingBranch(null);
    }
  };

  const handleSendInvitations = async () => {
    if (selectedStudents.size === 0 || !importJob) return;

    setSendingInvites(true);
    let successCount = 0;
    let failCount = 0;

    for (const studentId of selectedStudents) {
      const student = students.find(s => s.id === studentId);
      if (!student?.parent?.email) continue;

      try {
        await invitationService.send({
          type: 'parent',
          parentEmail: student.parent.email,
          schoolId: importJob.school_id,
          studentId: student.id,
          branchId: student.branch_id || userBranchId || null,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to invite parent for student ${studentId}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'Invitations sent!',
        description: `Successfully sent ${successCount} invitation${successCount > 1 ? 's' : ''}`
      });
      setSelectedStudents(new Set());
      fetchImportData();
    }

    if (failCount > 0) {
      toast({
        variant: 'destructive',
        title: 'Some invitations failed',
        description: `${failCount} invitation${failCount > 1 ? 's' : ''} failed to send`
      });
    }

    setSendingInvites(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!importJob) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Import Job Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested import job does not exist.</p>
            <Button onClick={() => navigate('/school/students')}>
              Go to students
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const uninvitedStudents = students.filter(s => !s.hasInvitation && s.parent?.email);
  const allSelected = uninvitedStudents.length > 0 && 
    uninvitedStudents.every(s => selectedStudents.has(s.id));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-display font-bold">Import Review</h1>
          <p className="text-muted-foreground text-sm">
            {importJob.file_name} • Imported {new Date(importJob.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge 
          variant={importJob.status === 'completed' ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {importJob.status === 'completed' ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
          ) : (
            importJob.status
          )}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">{importJob.created_students}</p>
                <p className="text-sm text-muted-foreground">Students Created</p>
              </div>
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{importJob.updated_students}</p>
                <p className="text-sm text-muted-foreground">Students Updated</p>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-success">{importJob.created_parents}</p>
                <p className="text-sm text-muted-foreground">Parents Created</p>
              </div>
              <Users className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{importJob.linked_relationships}</p>
                <p className="text-sm text-muted-foreground">Links Created</p>
              </div>
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        {importJob.error_count > 0 && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-destructive">{importJob.error_count}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Students List with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Imported Students</CardTitle>
              <CardDescription>
                Review students, assign branches, and send parent invitations
              </CardDescription>
            </div>
            {uninvitedStudents.length > 0 && (
              <Button 
                onClick={handleSendInvitations}
                disabled={selectedStudents.size === 0 || sendingInvites}
              >
                {sendingInvites ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send {selectedStudents.size > 0 ? `${selectedStudents.size} ` : ''}Invitation{selectedStudents.size !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found for this import</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All Header */}
              {uninvitedStudents.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg mb-4">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select all uninvited ({uninvitedStudents.length})
                  </label>
                </div>
              )}

              {/* Student Rows */}
              {students.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  {/* Checkbox */}
                  {!student.hasInvitation && student.parent?.email && (
                    <Checkbox
                      checked={selectedStudents.has(student.id)}
                      onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                    />
                  )}
                  {student.hasInvitation && (
                    <div className="w-5 flex justify-center">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                  )}
                  {!student.parent?.email && (
                    <div className="w-5" />
                  )}

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {student.first_name} {student.last_name}
                      </span>
                      {student.grade_level && (
                        <Badge variant="outline" className="text-xs">
                          {student.grade_level}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {student.parent?.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {student.parent.email}
                          {student.hasInvitation && (
                            <Badge variant="secondary" className="ml-2 text-xs">Invited</Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-warning">No parent email</span>
                      )}
                    </div>
                  </div>

                  {/* Branch Assignment */}
                  {branches.length > 0 && (
                    <div className="w-48">
                      <Select
                        value={student.branch_id || '_none_'}
                        onValueChange={(value) => handleBranchChange(student.id, value === '_none_' ? '' : value)}
                        disabled={updatingBranch === student.id}
                      >
                        <SelectTrigger className="h-9">
                          <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Assign branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">No Branch</SelectItem>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Footer */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/school-dashboard')}>
          Back to Dashboard
        </Button>
        <Button onClick={() => navigate('/school/students')}>
          View All Students
        </Button>
      </div>
    </div>
  );
};

export default ImportReviewPage;
