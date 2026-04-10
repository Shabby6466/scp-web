import { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
interface RequiredDocument {
  category: string;
  name: string;
  description: string;
  isMandatory: boolean;
}

interface DocumentStatus {
  category: string;
  status: 'missing' | 'pending' | 'approved' | 'rejected' | 'expired';
  document?: any;
  rejectionReason?: string;
}

const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    category: 'immunization_records',
    name: 'Immunization Records',
    description: 'Complete vaccination history including MMR, DTaP, Polio, etc.',
    isMandatory: true,
  },
  {
    category: 'health_forms',
    name: 'Health Forms',
    description: 'Physical examination and health history forms',
    isMandatory: true,
  },
  {
    category: 'emergency_contacts',
    name: 'Emergency Contacts',
    description: 'Emergency contact information and authorization forms',
    isMandatory: true,
  },
  {
    category: 'birth_certificate',
    name: 'Birth Certificate',
    description: 'Official birth certificate or proof of age',
    isMandatory: true,
  },
  {
    category: 'proof_of_residence',
    name: 'Proof of Residence',
    description: 'Utility bill, lease agreement, or mortgage statement',
    isMandatory: true,
  },
  {
    category: 'medical_records',
    name: 'Medical Records',
    description: 'Additional medical documentation or special needs information',
    isMandatory: false,
  },
];

const CATEGORY_GROUPS = {
  'Health & Medical': ['immunization_records', 'health_forms', 'medical_records'],
  'Identification & Residence': ['birth_certificate', 'proof_of_residence'],
  'Emergency Information': ['emergency_contacts'],
};

interface DocumentChecklistCardProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

const DocumentChecklistCard = ({ refreshTrigger, onRefresh }: DocumentChecklistCardProps) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(CATEGORY_GROUPS)));

  useEffect(() => {
    fetchData();
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchDocumentStatuses(selectedStudentId);
    }
  }, [selectedStudentId, refreshTrigger]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const studentsData = await studentParentService.getStudentsOfParent(user.id);

      if (studentsData && studentsData.length > 0) {
        setStudents(studentsData);
        if (!selectedStudentId) {
          setSelectedStudentId(studentsData[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentStatuses = async (studentId: string) => {
    try {
      const documents = await documentService.search({ ownerUserId: studentId });

      const statuses: DocumentStatus[] = REQUIRED_DOCUMENTS.map((reqDoc) => {
        const doc = (documents || []).find((d: any) => d.category === reqDoc.category);
        
        if (!doc) {
          return {
            category: reqDoc.category,
            status: 'missing' as const,
          };
        }

        // Check if expired
        if (doc.expiration_date && new Date(doc.expiration_date) < new Date()) {
          return {
            category: reqDoc.category,
            status: 'expired' as const,
            document: doc,
          };
        }

        return {
          category: reqDoc.category,
          status: doc.status as 'pending' | 'approved' | 'rejected',
          document: doc,
          rejectionReason: doc.rejection_reason || undefined,
        };
      });

      setDocumentStatuses(statuses);
    } catch (error: any) {
      console.error('Error fetching document statuses:', error);
    }
  };

  const handleUploadComplete = () => {
    fetchDocumentStatuses(selectedStudentId);
    if (onRefresh) onRefresh();
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'missing':
        return <Circle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      approved: { variant: 'default', label: 'Approved' },
      pending: { variant: 'secondary', label: 'Pending Review' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      expired: { variant: 'destructive', label: 'Expired' },
      missing: { variant: 'outline', label: 'Not Uploaded' },
    };

    const config = variants[status] || variants.missing;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = () => {
    const mandatoryDocs = REQUIRED_DOCUMENTS.filter((d) => d.isMandatory);
    const approvedCount = documentStatuses.filter(
      (s) => s.status === 'approved' && REQUIRED_DOCUMENTS.find((d) => d.category === s.category)?.isMandatory
    ).length;
    return {
      completed: approvedCount,
      total: mandatoryDocs.length,
      percentage: mandatoryDocs.length > 0 ? Math.round((approvedCount / mandatoryDocs.length) * 100) : 0,
    };
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

  const progress = calculateProgress();
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Checklist
              </CardTitle>
              <CardDescription>Track your document submission progress</CardDescription>
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
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Overall Progress</p>
                <p className="text-xs text-muted-foreground">
                  {progress.completed} of {progress.total} required documents approved
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{progress.percentage}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
            <Progress value={progress.percentage} className="h-3" />
            {progress.percentage === 100 ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">All required documents approved!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {progress.total - progress.completed} document{progress.total - progress.completed !== 1 ? 's' : ''}{' '}
                  remaining
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Document Categories */}
          <div className="space-y-4">
            {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => {
              const isExpanded = expandedGroups.has(groupName);
              const groupDocs = REQUIRED_DOCUMENTS.filter((doc) => categories.includes(doc.category));
              const groupStatuses = documentStatuses.filter((status) => categories.includes(status.category));
              const groupApproved = groupStatuses.filter((s) => s.status === 'approved').length;

              return (
                <div key={groupName} className="space-y-3">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <p className="font-semibold">{groupName}</p>
                        <p className="text-xs text-muted-foreground">
                          {groupApproved} of {groupDocs.length} complete
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {groupApproved}/{groupDocs.length}
                    </Badge>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 pl-4">
                      {groupDocs.map((reqDoc) => {
                        const status = documentStatuses.find((s) => s.category === reqDoc.category);
                        const statusType = status?.status || 'missing';

                        return (
                          <div
                            key={reqDoc.category}
                            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="mt-0.5">{getStatusIcon(statusType)}</div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{reqDoc.name}</h4>
                                    {reqDoc.isMandatory && (
                                      <Badge variant="outline" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                                </div>
                                {getStatusBadge(statusType)}
                              </div>

                              {status?.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-700 dark:text-red-300">
                                  <p className="font-medium">Rejection reason:</p>
                                  <p>{status.rejectionReason}</p>
                                </div>
                              )}

                              {status?.document?.expiration_date && statusType !== 'expired' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Expires: {new Date(status.document.expiration_date).toLocaleDateString()}
                                </div>
                              )}

                              <div className="mt-3">
                                {statusType === 'missing' || statusType === 'rejected' || statusType === 'expired' ? (
                                  <DocumentUploadDialog
                                    students={students}
                                    onDocumentUploaded={handleUploadComplete}
                                    defaultStudentId={selectedStudentId}
                                  >
                                    <Button size="sm" className="w-full sm:w-auto">
                                      <Upload className="h-4 w-4 mr-2" />
                                      {statusType === 'missing' ? 'Upload' : 'Replace'}
                                    </Button>
                                  </DocumentUploadDialog>
                                ) : statusType === 'pending' ? (
                                  <DocumentUploadDialog
                                    students={students}
                                    onDocumentUploaded={handleUploadComplete}
                                    defaultStudentId={selectedStudentId}
                                  >
                                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Replace
                                    </Button>
                                  </DocumentUploadDialog>
                                ) : (
                                  <DocumentUploadDialog
                                    students={students}
                                    onDocumentUploaded={handleUploadComplete}
                                    defaultStudentId={selectedStudentId}
                                  >
                                    <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Update
                                    </Button>
                                  </DocumentUploadDialog>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </>
  );
};

export default DocumentChecklistCard;
