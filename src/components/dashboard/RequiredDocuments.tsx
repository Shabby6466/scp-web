import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Upload, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DocumentUploadDialog from '@/components/DocumentUploadDialog';

interface RequiredDocumentsProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

function normalizeDocStatus(s: string) {
  return String(s || '').toLowerCase();
}

function mapOwnerDoc(d: any, studentId: string) {
  const cat =
    d.documentType?.category ||
    (d.documentType?.name
      ? String(d.documentType.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
      : '');
  return {
    ...d,
    student_id: studentId,
    ownerUserId: d.ownerUserId,
    category: cat,
    status: normalizeDocStatus(d.status),
  };
}

interface RequiredDocument {
  category: string;
  label: string;
  description: string;
  required: boolean;
  expiresAnnually?: boolean;
}

// This structure can be easily updated when you provide the required documents info
const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    category: 'immunization_records',
    label: 'Immunization Records',
    description: 'Current immunization records including all required vaccines',
    required: true,
    expiresAnnually: true
  },
  {
    category: 'health_forms',
    label: 'Health Forms',
    description: 'Complete health assessment form from your pediatrician',
    required: true,
    expiresAnnually: true
  },
  {
    category: 'emergency_contacts',
    label: 'Emergency Contacts',
    description: 'Emergency contact information and authorized pickup list',
    required: true,
    expiresAnnually: false
  },
  {
    category: 'birth_certificate',
    label: 'Birth Certificate',
    description: 'Copy of child\'s birth certificate',
    required: true,
    expiresAnnually: false
  },
  {
    category: 'proof_of_residence',
    label: 'Proof of Residence',
    description: 'Utility bill or lease agreement showing current address',
    required: true,
    expiresAnnually: false
  },
  {
    category: 'medical_records',
    label: 'Medical Records',
    description: 'Any relevant medical history or special needs documentation',
    required: false,
    expiresAnnually: false
  }
];

const RequiredDocuments = ({ refreshTrigger, onRefresh }: RequiredDocumentsProps) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, refreshTrigger]);

  const fetchData = async () => {
    if (!user) return;

    const links = await studentParentService.getStudentsOfParent(user.id);
    const list = Array.isArray(links) ? links : [];

    const mappedStudents = list
      .map((link: any) => {
        const s = link?.student;
        if (!s?.id) return null;
        const sp = s.studentProfile;
        const parts = (s.name || '').trim().split(/\s+/).filter(Boolean);
        return {
          id: s.id,
          first_name: sp?.firstName ?? parts[0] ?? '',
          last_name: sp?.lastName ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''),
        };
      })
      .filter(Boolean) as { id: string; first_name: string; last_name: string }[];

    setStudents(mappedStudents);

    const allDocs: any[] = [];
    for (const row of mappedStudents) {
      const raw = await documentService.listByOwner(row.id).catch(() => []);
      const docs = (Array.isArray(raw) ? raw : []).map((d) => mapOwnerDoc(d, row.id));
      allDocs.push(...docs);
    }
    setDocuments(allDocs);

    if (mappedStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(mappedStudents[0].id);
    }
  };

  const getDocumentStatus = (category: string, studentId: string) => {
    const studentDocs = documents.filter(
      (d) => (d.ownerUserId ?? d.student_id) === studentId && d.category === category,
    );

    if (studentDocs.length === 0) return 'missing';

    const approved = studentDocs.find((d) => d.status === 'approved');
    if (approved) return 'complete';

    const pending = studentDocs.find((d) => d.status === 'pending');
    if (pending) return 'pending';

    return 'needs-resubmit';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'pending') return <Circle className="h-5 w-5 text-yellow-600" />;
    if (status === 'needs-resubmit') return <AlertCircle className="h-5 w-5 text-red-600" />;
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'complete') return <Badge className="bg-green-600">Approved</Badge>;
    if (status === 'pending') return <Badge variant="outline" className="border-yellow-600 text-yellow-700">Under Review</Badge>;
    if (status === 'needs-resubmit') return <Badge variant="destructive">Resubmit Required</Badge>;
    return <Badge variant="secondary">Not Submitted</Badge>;
  };

  const currentStudent = students.find(s => s.id === selectedStudent);
  const requiredDocs = REQUIRED_DOCUMENTS.filter(d => d.required);
  const completedCount = requiredDocs.filter(d => 
    getDocumentStatus(d.category, selectedStudent || '') === 'complete'
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Required Documents Checklist</CardTitle>
            <CardDescription>
              Track and submit all required documents for enrollment
            </CardDescription>
          </div>
          {students.length > 0 && (
            <Badge variant="outline" className="text-sm">
              {completedCount} of {requiredDocs.length} Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {students.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please add a student first to see required documents
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Student Selector */}
            {students.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {students.map(student => (
                  <Button
                    key={student.id}
                    variant={selectedStudent === student.id ? "default" : "outline"}
                    onClick={() => setSelectedStudent(student.id)}
                    size="sm"
                  >
                    {student.first_name} {student.last_name}
                  </Button>
                ))}
              </div>
            )}

            {/* Document Checklist */}
            <div className="space-y-3">
              {REQUIRED_DOCUMENTS.map((doc) => {
                const status = getDocumentStatus(doc.category, selectedStudent || '');
                return (
                  <div
                    key={doc.category}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{doc.label}</h4>
                        {doc.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {doc.expiresAnnually && (
                          <Badge variant="outline" className="text-xs">Annual</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                      <div className="flex items-center gap-2 pt-2">
                        {getStatusBadge(status)}
                        {status === 'missing' || status === 'needs-resubmit' ? (
                          <DocumentUploadDialog 
                            students={students} 
                            onDocumentUploaded={onRefresh}
                          >
                            <Button size="sm" variant="outline">
                              <Upload className="h-3 w-3 mr-1" />
                              Upload
                            </Button>
                          </DocumentUploadDialog>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Help Text */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Documents marked as "Annual" must be renewed each school year. 
                You'll receive reminders before they expire.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RequiredDocuments;
