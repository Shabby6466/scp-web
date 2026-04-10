import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import { BatchDocumentScanner } from "./BatchDocumentScanner";

interface BatchUploadDialogProps {
  students: any[];
  onComplete: () => void;
  children?: React.ReactNode;
}

export const BatchUploadDialog = ({
  students,
  onComplete,
  children,
}: BatchUploadDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleComplete = () => {
    onComplete();
    // Keep dialog open so user can see results
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" disabled={students.length === 0}>
            <Layers className="h-4 w-4 mr-2" />
            Batch Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            AI Batch Document Scanner
          </DialogTitle>
          <DialogDescription>
            Upload multiple documents at once. Our AI will automatically detect document types,
            extract key information, and match them to your children.
          </DialogDescription>
        </DialogHeader>

        <BatchDocumentScanner students={students} onComplete={handleComplete} />
      </DialogContent>
    </Dialog>
  );
};
