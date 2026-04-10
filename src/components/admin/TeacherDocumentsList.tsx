import { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Download, Trash2, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
}

interface TeacherDocumentsListProps {
  teacherId: string;
  teacherName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChange?: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  certification: 'Teaching Certification',
  background_check: 'Background Check',
  cpr_certification: 'CPR/First Aid Certification',
  health_clearance: 'Health Clearance',
  training_record: 'Training Record',
  employment_verification: 'Employment Verification',
  reference_letter: 'Reference Letter',
  other: 'Other',
};

const TeacherDocumentsList = ({
  teacherId,
  teacherName,
  open,
  onOpenChange,
  onDocumentsChange,
}: TeacherDocumentsListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open, teacherId]);

  const fetchDocuments = async () => {
    try {
      const data = await documentService.listByOwner(teacherId);
      const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
      setDocuments(list);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading documents",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const data = await documentService.getDownloadUrl(document.id);
      const url = (data as any)?.url ?? (data as any)?.signedUrl ?? data;

      const a = window.document.createElement('a');
      a.href = typeof url === 'string' ? url : '';
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your document download has started.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteId}`);

      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });

      setDeleteId(null);
      fetchDocuments();
      onDocumentsChange?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return null;

    const today = new Date();
    const expiry = new Date(expirationDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < today) {
      return { label: 'Expired', color: 'destructive', icon: AlertTriangle };
    }

    if (expiry < thirtyDaysFromNow) {
      return { label: 'Expiring Soon', color: 'secondary', icon: AlertTriangle };
    }

    return { label: 'Valid', color: 'default', icon: CheckCircle };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documents - {teacherName}</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => {
                const status = getExpirationStatus(document.expiration_date);
                const StatusIcon = status?.icon;
                
                return (
                  <Card key={document.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{document.file_name}</span>
                            {status && StatusIcon && (
                              <Badge variant={status.color as any}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                              <strong>Type:</strong> {DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type}
                            </div>
                            <div>
                              <strong>Size:</strong> {(document.file_size / 1024).toFixed(2)} KB
                            </div>
                            {document.expiration_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <strong>Expires:</strong> {new Date(document.expiration_date).toLocaleDateString()}
                              </div>
                            )}
                            {document.notes && (
                              <div>
                                <strong>Notes:</strong> {document.notes}
                              </div>
                            )}
                            <div>
                              <strong>Uploaded:</strong> {new Date(document.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(document)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteId(document.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeacherDocumentsList;
