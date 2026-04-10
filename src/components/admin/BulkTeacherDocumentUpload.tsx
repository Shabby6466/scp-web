import { useState } from "react";
import { documentService } from "@/services/documentService";
import { storageService } from "@/services/storageService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface BulkTeacherDocumentUploadProps {
  schoolId: string;
  teachers: Teacher[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FileUpload {
  file: File;
  teacherId: string;
  documentType: string;
  expirationDate: string;
}

const BulkTeacherDocumentUpload = ({
  schoolId,
  teachers,
  onClose,
  onSuccess,
}: BulkTeacherDocumentUploadProps) => {
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);

  const documentTypes = [
    "Certification",
    "Background Check",
    "CPR Certification",
    "First Aid",
    "Training Certificate",
    "Health Clearance",
    "TB Test",
    "Professional Development",
    "Other",
  ];

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (!documentType) {
      toast.error("Please select a document type first");
      return;
    }

    if (selectedTeachers.length === 0) {
      toast.error("Please select at least one teacher");
      return;
    }

    const newUploads: FileUpload[] = [];
    selectedFiles.forEach((file, index) => {
      if (index < selectedTeachers.length) {
        newUploads.push({
          file,
          teacherId: selectedTeachers[index],
          documentType,
          expirationDate,
        });
      }
    });

    setFiles((prev) => [...prev, ...newUploads]);
    toast.success(`Added ${newUploads.length} file(s) for upload`);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please add files to upload");
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const upload of files) {
        try {
          const presignData = await documentService.presign({
            documentTypeId: upload.documentType,
            ownerUserId: upload.teacherId,
            fileName: upload.file.name,
            mimeType: upload.file.type,
            sizeBytes: upload.file.size,
          });

          const presignedUrl = (presignData as any)?.url ?? (presignData as any)?.presignedUrl;
          const s3Key = (presignData as any)?.key ?? (presignData as any)?.s3Key;

          if (presignedUrl) {
            await storageService.uploadFile(presignedUrl, upload.file);
          }

          await documentService.complete({
            documentTypeId: upload.documentType,
            ownerUserId: upload.teacherId,
            s3Key: s3Key ?? '',
            fileName: upload.file.name,
            mimeType: upload.file.type,
            sizeBytes: upload.file.size,
          });

          successCount++;
        } catch (error) {
          console.error("Error uploading file:", error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} document(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} document(s)`);
      }

      if (successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error in bulk upload:", error);
      toast.error("Failed to complete bulk upload");
    } finally {
      setUploading(false);
    }
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : "Unknown";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Teacher Document Upload</DialogTitle>
          <DialogDescription>
            Upload the same document type for multiple teachers at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>

          {/* Teacher Selection */}
          <div className="space-y-2">
            <Label>Select Teachers *</Label>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTeachers(teachers.map((t) => t.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTeachers([])}
                >
                  Clear All
                </Button>
                <Badge variant="secondary">
                  {selectedTeachers.length} selected
                </Badge>
              </div>
              {teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={teacher.id}
                    checked={selectedTeachers.includes(teacher.id)}
                    onCheckedChange={() => handleTeacherToggle(teacher.id)}
                  />
                  <label
                    htmlFor={teacher.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {teacher.first_name} {teacher.last_name} ({teacher.email})
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload Files</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload files</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, or PNG • Max 10MB per file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Files will be auto-assigned to selected teachers in order
                </p>
              </label>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Files to Upload ({files.length})</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((upload, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTeacherName(upload.teacherId)} • {upload.documentType}
                          {upload.expirationDate && ` • Expires ${new Date(upload.expirationDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
              {uploading ? "Uploading..." : `Upload ${files.length} Document(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTeacherDocumentUpload;
