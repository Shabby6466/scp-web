import { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { mapDocumentFromNest, mapStudentFromParentLink } from '@/lib/nestMappers';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DocumentUploadDialog from '@/components/DocumentUploadDialog';
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  AlertTriangle,
  Upload,
  FileText,
  RefreshCw,
  User,
} from 'lucide-react';

type RowStatus = 'missing' | 'pending' | 'approved' | 'rejected' | 'expired';

interface ChecklistRow {
  typeId: string;
  name: string;
  description: string;
  isMandatory: boolean;
  status: RowStatus;
  document?: Record<string, unknown>;
  rejectionReason?: string;
}

interface DocumentChecklistCardProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

const DocumentChecklistCard = ({ refreshTrigger, onRefresh }: DocumentChecklistCardProps) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<
    { id: string; first_name: string; last_name: string }[]
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshTrigger
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (selectedStudentId) {
      void fetchRows(selectedStudentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshTrigger
  }, [selectedStudentId, refreshTrigger]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const studentsData = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(studentsData) ? studentsData : [];
      const mapped = list
        .map((l: unknown) =>
          mapStudentFromParentLink(l as Parameters<typeof mapStudentFromParentLink>[0], user.id),
        )
        .filter(Boolean) as { id: string; first_name: string; last_name: string }[];

      setStudents(mapped);
      if (mapped.length > 0 && !selectedStudentId) {
        setSelectedStudentId(mapped[0].id);
      }
    } catch (error: unknown) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const rowStatusFromDoc = (raw: Record<string, unknown> | null | undefined): RowStatus => {
    if (!raw) return 'missing';
    const doc = mapDocumentFromNest(raw);
    if (doc.verifiedAt) return 'approved';
    const exp = doc.expiration_date as string | undefined;
    if (exp && new Date(exp) < new Date()) return 'expired';
    const st = String(doc.status || '').toLowerCase();
    if (st === 'rejected') return 'rejected';
    return 'pending';
  };

  const fetchRows = async (studentId: string) => {
    try {
      const summary = (await documentService.getSummary(studentId)) as {
        items?: {
          documentType: {
            id: string;
            name?: string;
            isMandatory?: boolean;
          };
          latestDocument?: Record<string, unknown> | null;
        }[];
      };
      const items = summary?.items ?? [];
      setRows(
        items.map((item) => {
          const dt = item.documentType;
          const latest = item.latestDocument;
          const status = rowStatusFromDoc(latest ?? null);
          const doc = latest ? (mapDocumentFromNest(latest) as Record<string, unknown>) : undefined;
          return {
            typeId: dt.id,
            name: dt.name || 'Document',
            description: '',
            isMandatory: !!dt.isMandatory,
            status,
            document: doc,
            rejectionReason: (doc?.rejection_reason as string) || undefined,
          };
        }),
      );
    } catch (error: unknown) {
      console.error('Error fetching document statuses:', error);
      setRows([]);
    }
  };

  const handleUploadComplete = () => {
    if (selectedStudentId) void fetchRows(selectedStudentId);
    onRefresh?.();
  };

  const getStatusIcon = (status: RowStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: RowStatus) => {
    const variants: Record<RowStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      approved: { variant: 'default', label: 'Approved' },
      pending: { variant: 'secondary', label: 'Pending Review' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      expired: { variant: 'destructive', label: 'Expired' },
      missing: { variant: 'outline', label: 'Not Uploaded' },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const mandatory = rows.filter((r) => r.isMandatory);
  const approvedMandatory = mandatory.filter((r) => r.status === 'approved').length;
  const progress = {
    completed: approvedMandatory,
    total: mandatory.length,
    percentage:
      mandatory.length > 0 ? Math.round((approvedMandatory / mandatory.length) * 100) : rows.length === 0 ? 0 : 100,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading checklist...</div>
        </CardContent>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Checklist</CardTitle>
          <CardDescription>Add a student to view required documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No students added yet. Add your first child to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Checklist
            </CardTitle>
            <CardDescription>Forms your school assigned to this child</CardDescription>
          </div>
          {students.length > 1 && (
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overall Progress</p>
              <p className="text-xs text-muted-foreground">
                {progress.completed} of {progress.total} required documents verified
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{progress.percentage}%</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>
          <Progress value={progress.percentage} className="h-3" />
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No document types are assigned yet. Your school will assign required forms.
            </p>
          ) : progress.percentage === 100 && progress.total > 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">All required documents verified!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {Math.max(0, progress.total - progress.completed)} document
                {progress.total - progress.completed !== 1 ? 's' : ''} remaining
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.typeId}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="mt-0.5">{getStatusIcon(row.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{row.name}</h4>
                      {row.isMandatory && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {row.description ? (
                      <p className="text-sm text-muted-foreground">{row.description}</p>
                    ) : null}
                  </div>
                  {getStatusBadge(row.status)}
                </div>

                {row.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium">Rejection reason:</p>
                    <p>{row.rejectionReason}</p>
                  </div>
                )}

                {row.document?.expiration_date && row.status !== 'expired' && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Expires: {new Date(row.document.expiration_date as string).toLocaleDateString()}
                  </div>
                )}

                <div className="mt-3">
                  <DocumentUploadDialog
                    students={students}
                    onDocumentUploaded={handleUploadComplete}
                    defaultStudentId={selectedStudentId}
                  >
                    <Button size="sm" className="w-full sm:w-auto">
                      <Upload className="h-4 w-4 mr-2" />
                      {row.status === 'missing' ? 'Upload' : row.status === 'pending' ? 'Replace' : 'Update'}
                    </Button>
                  </DocumentUploadDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentChecklistCard;
