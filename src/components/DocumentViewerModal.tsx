import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Download, ExternalLink } from 'lucide-react';
import { isPdfFile, isImageFile, getFileType } from '@/utils/pdfToImage';

interface DocumentRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  category: string;
  status: string;
  notes?: string | null;
  expiration_date?: string | null;
  student_id: string;
  parent_id: string;
  created_at: string;
  updated_at: string;
}

interface DocumentViewerModalProps {
  document: DocumentRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

const DocumentViewerModal = ({ document, open, onOpenChange }: DocumentViewerModalProps) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'unknown'>('unknown');

  useEffect(() => {
    if (document && open) {
      loadDocument();
    } else {
      setFileUrl(null);
    }
  }, [document, open]);

  const loadDocument = async () => {
    if (!document) return;

    setLoading(true);
    try {
      const { url } = await documentService.getDownloadUrl(document.id);

      const type = getFileType(document.file_name);
      setFileType(type);
      setFileUrl(url);
      
      if (type === 'unknown') {
        toast({
          variant: 'destructive',
          title: 'Preview not available',
          description: 'This file type cannot be previewed. Please download to view.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load document',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {document?.file_name}
              </DialogTitle>
              <DialogDescription>
                {document && CATEGORY_LABELS[document.category]}
              </DialogDescription>
            </div>
            {fileUrl && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={openInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={fileUrl} download={document?.file_name}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted rounded-lg">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {!loading && fileType === 'pdf' && fileUrl && (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={document?.file_name}
            />
          )}

          {!loading && fileType === 'image' && fileUrl && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-neutral-100 dark:bg-neutral-900">
              <img
                src={fileUrl}
                alt={document?.file_name}
                className="max-w-full max-h-full object-contain shadow-lg rounded"
              />
            </div>
          )}

          {!loading && fileType === 'unknown' && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please download the file to view it
                </p>
                {fileUrl && (
                  <Button variant="outline" className="mt-4" asChild>
                    <a href={fileUrl} download={document?.file_name}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {document?.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-1">Notes:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{document.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewerModal;
