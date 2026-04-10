import { useState } from 'react';
import { documentService } from '@/services/documentService';
import { storageService } from '@/services/storageService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2 } from 'lucide-react';

interface TeacherDocumentUploadProps {
  teacherId: string;
  schoolId: string;
  onUploadComplete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOCUMENT_TYPES = [
  { value: 'certification', label: 'Teaching Certification' },
  { value: 'background_check', label: 'Background Check' },
  { value: 'cpr_certification', label: 'CPR/First Aid Certification' },
  { value: 'health_clearance', label: 'Health Clearance' },
  { value: 'training_record', label: 'Training Record' },
  { value: 'employment_verification', label: 'Employment Verification' },
  { value: 'reference_letter', label: 'Reference Letter' },
  { value: 'other', label: 'Other' },
];

const TeacherDocumentUpload = ({
  teacherId,
  schoolId,
  onUploadComplete,
  open,
  onOpenChange,
}: TeacherDocumentUploadProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 20MB.",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !documentType) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a file and document type.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please sign in to upload documents.",
      });
      return;
    }

    setUploading(true);

    try {
      const presignData = await documentService.presign({
        documentTypeId: documentType,
        ownerUserId: teacherId,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      const presignedUrl = (presignData as any)?.url ?? (presignData as any)?.presignedUrl;
      const s3Key = (presignData as any)?.key ?? (presignData as any)?.s3Key;

      if (presignedUrl) {
        await storageService.uploadFile(presignedUrl, file);
      }

      await documentService.complete({
        documentTypeId: documentType,
        ownerUserId: teacherId,
        s3Key: s3Key ?? '',
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        notes: notes || undefined,
      });

      toast({
        title: "Document uploaded",
        description: "Teacher document has been uploaded successfully.",
      });

      setFile(null);
      setDocumentType('');
      setExpirationDate('');
      setNotes('');
      onOpenChange(false);
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Teacher Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>File *</Label>
            <Input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              required
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Expiration Date</Label>
            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              Optional - Set an expiration date to receive alerts
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this document..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherDocumentUpload;
