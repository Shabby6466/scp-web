import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { studentProfileService } from '@/services/studentProfileService';
import { documentService } from '@/services/documentService';
import { documentTypeService } from '@/services/documentTypeService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, CheckCircle, Clock, AlertCircle, ArrowLeft, GraduationCap, Building2 } from 'lucide-react';
import DocumentUploadDialog from '@/components/DocumentUploadDialog';

function slugCategory(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeStatus(s: string) {
  return String(s || '').toLowerCase();
}

function mapApiDocument(d: any) {
  const cat =
    d.documentType?.category ||
    (d.documentType?.name ? slugCategory(d.documentType.name) : '');
  return {
    id: d.id,
    category: cat,
    status: normalizeStatus(d.status),
    file_name: d.fileName,
    created_at: d.createdAt,
    ownerUserId: d.ownerUserId,
    documentTypeId: d.documentTypeId,
  };
}

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  school_id: string | null;
  school_name: string | null;
  parent_id: string;
  school?: { name: string };
}

interface RequiredDocument {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_mandatory: boolean;
}

interface UploadedDocument {
  id: string;
  category: string;
  status: string;
  file_name: string;
  created_at: string;
}

const ChildDocumentUpload = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (studentId && user) {
      fetchData();
    }
  }, [studentId, user, refreshTrigger]);

  const fetchData = async () => {
    if (!studentId) return;

    try {
      const detail = (await studentProfileService.getById(studentId)) as any;
      if (!detail?.id) {
        setStudent(null);
        setLoading(false);
        return;
      }

      const dob = detail.dateOfBirth
        ? new Date(detail.dateOfBirth).toISOString().slice(0, 10)
        : '';
      const schoolName = detail.school?.name ?? null;
      const schoolId = detail.schoolId ?? detail.branch?.schoolId ?? null;

      setStudent({
        id: detail.id,
        first_name: detail.firstName ?? '',
        last_name: detail.lastName ?? '',
        date_of_birth: dob,
        school_id: schoolId,
        school_name: schoolName,
        parent_id: user?.id ?? '',
        school: detail.school?.name ? { name: detail.school.name } : undefined,
      });

      if (schoolId) {
        try {
          const types = await documentTypeService.list({
            schoolId: schoolId,
            targetRole: 'STUDENT',
            includeInactive: false,
          });
          const list = Array.isArray(types) ? types : [];
          setRequiredDocs(
            list
              .filter((dt: any) => dt.isActive !== false)
              .map((dt: any) => ({
                id: dt.id,
                name: dt.name,
                category: dt.category || slugCategory(dt.name),
                description: dt.description ?? null,
                is_mandatory: dt.isMandatory !== false,
              })),
          );
        } catch {
          setRequiredDocs([]);
        }
      } else {
        setRequiredDocs([]);
      }

      const docsRaw = await documentService.listByOwner(studentId);
      const docs = (Array.isArray(docsRaw) ? docsRaw : []).map(mapApiDocument);
      setUploadedDocs(docs);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load student data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (category: string) => {
    const doc = uploadedDocs.find((d) => d.category === category);
    if (!doc) return { status: 'missing', doc: null };
    return { status: doc.status, doc };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-success">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" /> Pending Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" /> Needs Resubmit
          </Badge>
        );
      case 'missing':
        return (
          <Badge variant="outline">
            <Upload className="h-3 w-3 mr-1" /> Not Uploaded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const completedCount = requiredDocs.filter((rd) => {
    const { status } = getDocumentStatus(rd.category);
    return status === 'approved';
  }).length;

  const progress = requiredDocs.length > 0 ? Math.round((completedCount / requiredDocs.length) * 100) : 0;

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast({
      title: 'Document uploaded',
      description: 'Your document has been submitted for review.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Student Not Found</CardTitle>
            <CardDescription>The student you're looking for doesn't exist or you don't have access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentsForDialog = [
    {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth,
      school_id: student.school_id,
      school_name: student.school_name,
      parent_id: student.parent_id,
      branch_id: null,
      grade_level: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
      deleted_by: null,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              {student.first_name} {student.last_name}
            </h1>
            {student.school?.name && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {student.school.name}
              </p>
            )}
          </div>
          <DocumentUploadDialog
            students={studentsForDialog}
            onDocumentUploaded={handleUploadSuccess}
            defaultStudentId={student.id}
          >
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DocumentUploadDialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Completion</CardTitle>
            <CardDescription>
              {completedCount} of {requiredDocs.length} required documents approved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {progress === 100 ? '🎉 All documents complete!' : `${100 - progress}% remaining`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Required Documents
            </CardTitle>
            <CardDescription>Upload the following documents for enrollment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requiredDocs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No required documents configured for this school yet.
              </p>
            ) : (
              requiredDocs.map((reqDoc) => {
                const { status, doc } = getDocumentStatus(reqDoc.category);
                return (
                  <div
                    key={reqDoc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{reqDoc.name}</h4>
                        {reqDoc.is_mandatory && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {reqDoc.description && <p className="text-sm text-muted-foreground">{reqDoc.description}</p>}
                      {doc && (
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">{getStatusBadge(status)}</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChildDocumentUpload;
