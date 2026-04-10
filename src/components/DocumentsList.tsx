import { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import DocumentViewerModal from './DocumentViewerModal';

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  expired: 'destructive',
};

interface DocumentsListProps {
  refreshTrigger: number;
}

const DocumentsList = ({ refreshTrigger }: DocumentsListProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
    fetchStudents();
  }, [user, refreshTrigger]);

  const fetchStudents = async () => {
    if (!user) return;

    try {
      const data = await studentParentService.getStudentsOfParent(user.id);
      setStudents(data || []);
    } catch (error: any) {
      console.error('Failed to load students:', error);
    }
  };

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const data = await documentService.listByOwner(user.id);
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load documents',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = (doc: any) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const downloadDocument = async (doc: any) => {
    try {
      const { url } = await documentService.getDownloadUrl(doc.id);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Download started',
        description: `Downloading ${doc.file_name}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: error.message,
      });
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : '';
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const fileName = doc.file_name.toLowerCase();
    const category = CATEGORY_LABELS[doc.category].toLowerCase();
    const studentName = getStudentName(doc.student_id).toLowerCase();
    const status = doc.status.toLowerCase();
    
    return fileName.includes(query) || 
           category.includes(query) || 
           studentName.includes(query) ||
           status.includes(query);
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No documents uploaded yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload your first document to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DocumentViewerModal
        document={selectedDocument}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
      
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents by name, category, student, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredDocuments.map((doc) => (
        <Card key={doc.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {doc.file_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {CATEGORY_LABELS[doc.category]}
                </CardDescription>
              </div>
              <Badge variant={STATUS_COLORS[doc.status]}>
                {doc.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {doc.notes && (
                <p className="text-sm text-muted-foreground">{doc.notes}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  {doc.expiration_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Expires: {new Date(doc.expiration_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewDocument(doc)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(doc)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
            ))}
          </>
        )}
      </div>
    </>
  );
};

export default DocumentsList;
