import { useState } from 'react';
import { documentService } from '@/services/documentService';
import { storageService } from '@/services/storageService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, X, CheckCircle, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface BulkDocumentUploadDialogProps {
  students: any[];
  onDocumentUploaded: () => void;
  children?: React.ReactNode;
}

interface FileUpload {
  file: File;
  studentId: string;
  category: string;
  expirationDate?: string;
  notes?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

const BulkDocumentUploadDialog = ({ students, onDocumentUploaded, children }: BulkDocumentUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles = selectedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `${file.name} exceeds 20MB limit`,
        });
        return false;
      }
      
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: `${file.name} is not a supported file type`,
        });
        return false;
      }
      
      return true;
    });

    const newFiles: FileUpload[] = validFiles.map(file => ({
      file,
      studentId: students.length === 1 ? students[0].id : '',
      category: '',
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, updates: Partial<FileUpload>) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const validateFiles = () => {
    for (const file of files) {
      if (!file.studentId) {
        toast({
          variant: 'destructive',
          title: 'Missing student',
          description: 'Please select a student for all files',
        });
        return false;
      }
      if (!file.category) {
        toast({
          variant: 'destructive',
          title: 'Missing category',
          description: 'Please select a category for all files',
        });
        return false;
      }
    }
    return true;
  };

  const uploadSingleFile = async (fileUpload: FileUpload, index: number): Promise<boolean> => {
    if (!user) return false;

    try {
      updateFile(index, { status: 'uploading', progress: 0 });

      updateFile(index, { progress: 30 });
      const actingUserId = user.id;
      const isChildProfile = fileUpload.studentId !== actingUserId;
      const presignData = await documentService.presign({
        documentTypeId: fileUpload.category,
        ownerUserId: actingUserId,
        ...(isChildProfile ? { studentProfileId: fileUpload.studentId } : {}),
        fileName: fileUpload.file.name,
        mimeType: fileUpload.file.type,
        sizeBytes: fileUpload.file.size,
      });

      updateFile(index, { progress: 60 });
      await storageService.uploadFile(presignData.presignedUrl, fileUpload.file);

      updateFile(index, { progress: 85 });
      await documentService.complete({
        documentTypeId: fileUpload.category,
        ownerUserId: actingUserId,
        ...(isChildProfile ? { studentProfileId: fileUpload.studentId } : {}),
        s3Key: presignData.s3Key,
        fileName: fileUpload.file.name,
        mimeType: fileUpload.file.type,
        sizeBytes: fileUpload.file.size,
        notes: fileUpload.notes || undefined,
      });

      updateFile(index, { status: 'success', progress: 100 });
      return true;
    } catch (error: any) {
      updateFile(index, { 
        status: 'error', 
        error: error.message,
        progress: 0 
      });
      return false;
    }
  };

  const handleBulkUpload = async () => {
    if (!validateFiles()) return;

    setUploading(true);

    const results = await Promise.allSettled(
      files.map((file, index) => uploadSingleFile(file, index))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = files.length - successCount;

    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} document${successCount !== 1 ? 's' : ''} uploaded successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      });
      
      onDocumentUploaded();
      
      if (failedCount === 0) {
        setTimeout(() => {
          setOpen(false);
          setFiles([]);
        }, 1500);
      } else {
        // Keep dialog open with only failed files
        setFiles(prev => prev.filter(f => f.status === 'error'));
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'All uploads failed. Please try again.',
      });
    }

    setUploading(false);
  };

  const getOverallProgress = () => {
    if (files.length === 0) return 0;
    const totalProgress = files.reduce((sum, f) => sum + f.progress, 0);
    return Math.round(totalProgress / files.length);
  };

  const canUpload = files.length > 0 && files.every(f => f.studentId && f.category) && !uploading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" disabled={students.length === 0}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Document Upload</DialogTitle>
          <DialogDescription>
            Upload multiple documents at once. Select files and assign categories for each.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <Input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="bulk-file-input"
              disabled={uploading}
            />
            <Label htmlFor="bulk-file-input" className="cursor-pointer">
              <UploadCloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Click to select files</p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG, Word documents (max 20MB each)
              </p>
            </Label>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{files.length} file{files.length !== 1 ? 's' : ''} selected</h4>
                {uploading && (
                  <div className="text-sm text-muted-foreground">
                    Overall Progress: {getOverallProgress()}%
                  </div>
                )}
              </div>

              {files.map((fileUpload, index) => (
                <Card key={index} className={
                  fileUpload.status === 'success' ? 'border-green-500' :
                  fileUpload.status === 'error' ? 'border-red-500' :
                  fileUpload.status === 'uploading' ? 'border-primary' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* File Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{fileUpload.file.name}</p>
                            {fileUpload.status === 'success' && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {fileUpload.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {fileUpload.error && (
                            <p className="text-xs text-red-600 mt-1">{fileUpload.error}</p>
                          )}
                        </div>
                        {!uploading && fileUpload.status !== 'success' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {fileUpload.status === 'uploading' && (
                        <Progress value={fileUpload.progress} className="h-2" />
                      )}

                      {/* File Settings */}
                      {fileUpload.status !== 'success' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Student *</Label>
                            <Select
                              value={fileUpload.studentId}
                              onValueChange={(value) => updateFile(index, { studentId: value })}
                              disabled={uploading}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select student" />
                              </SelectTrigger>
                              <SelectContent>
                                {students.map((student) => (
                                  <SelectItem key={student.id} value={student.id}>
                                    {student.first_name} {student.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Category *</Label>
                            <Select
                              value={fileUpload.category}
                              onValueChange={(value) => updateFile(index, { category: value })}
                              disabled={uploading}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Expiration Date</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={fileUpload.expirationDate || ''}
                              onChange={(e) => updateFile(index, { expirationDate: e.target.value })}
                              disabled={uploading}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Input
                              placeholder="Optional notes"
                              className="h-8 text-xs"
                              value={fileUpload.notes || ''}
                              onChange={(e) => updateFile(index, { notes: e.target.value })}
                              disabled={uploading}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {files.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={handleBulkUpload}
                disabled={!canUpload}
                className="flex-1"
              >
                {uploading ? `Uploading... (${getOverallProgress()}%)` : `Upload ${files.length} Document${files.length !== 1 ? 's' : ''}`}
              </Button>
              {!uploading && (
                <Button
                  variant="outline"
                  onClick={() => setFiles([])}
                >
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDocumentUploadDialog;
