import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  File,
  RefreshCw,
} from "lucide-react";

interface ResumeUploadProps {
  teacherId: string;
  schoolId: string;
  currentPath: string | null;
  onPathChange: (path: string | null) => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ResumeUpload({ teacherId, schoolId, currentPath, onPathChange }: ResumeUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `resume_${timestamp}.${ext}`;

      const presignData = await api.post('/storage/presign', {
        bucket: 'staff-resumes',
        key: `${schoolId}/${teacherId}/${fileName}`,
        contentType: file.type,
      });

      await fetch(presignData.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const filePath = presignData.key || `${schoolId}/${teacherId}/${fileName}`;
      onPathChange(filePath);

      toast({
        title: "Resume Uploaded",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async () => {
    if (!currentPath) return;

    try {
      const { url } = await api.get(`/storage/download-url?bucket=staff-resumes&key=${encodeURIComponent(currentPath)}`);

      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName(currentPath);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!currentPath) return;

    try {
      setDeleting(true);

      await api.post('/storage/delete', {
        bucket: 'staff-resumes',
        keys: [currentPath],
      });

      onPathChange(null);

      toast({
        title: "Resume Deleted",
        description: "File removed successfully",
      });
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete resume",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume
        </CardTitle>
        <CardDescription>
          Upload the staff member's resume (PDF or Word, max 10MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx"
          className="hidden"
        />

        {currentPath ? (
          <div className="space-y-3">
            {/* Current file display */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <File className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{getFileName(currentPath)}</p>
                <p className="text-xs text-muted-foreground">Resume uploaded</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {uploading ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload resume
                  </span>
                </div>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
