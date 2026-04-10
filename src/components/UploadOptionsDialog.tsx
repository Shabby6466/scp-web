import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, UploadCloud } from 'lucide-react';
import DocumentUploadDialog from './DocumentUploadDialog';
import BulkDocumentUploadDialog from './BulkDocumentUploadDialog';

interface UploadOptionsDialogProps {
  students: any[];
  onDocumentUploaded: () => void;
  disabled?: boolean;
}

const UploadOptionsDialog = ({ students, onDocumentUploaded, disabled }: UploadOptionsDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start" size="lg" disabled={disabled}>
          <Upload className="h-5 w-5 mr-2" />
          Upload Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Upload Method</DialogTitle>
          <DialogDescription>
            Select how you'd like to upload documents
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-4 py-4">
          <DocumentUploadDialog students={students} onDocumentUploaded={() => {
            onDocumentUploaded();
            setOpen(false);
          }}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Single Upload</CardTitle>
                <CardDescription className="text-xs">
                  Upload one document at a time with detailed options
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button variant="outline" className="w-full">
                  Select Single File
                </Button>
              </CardContent>
            </Card>
          </DocumentUploadDialog>

          <BulkDocumentUploadDialog students={students} onDocumentUploaded={() => {
            onDocumentUploaded();
            setOpen(false);
          }}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
                  <UploadCloud className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle>Bulk Upload</CardTitle>
                <CardDescription className="text-xs">
                  Upload multiple documents at once for faster processing
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button variant="outline" className="w-full">
                  Select Multiple Files
                </Button>
              </CardContent>
            </Card>
          </BulkDocumentUploadDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadOptionsDialog;
