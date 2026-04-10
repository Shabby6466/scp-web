import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentService } from "@/services/documentService";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DocumentForExport {
  id: string;
  name: string;
  filePath?: string;
  fileName?: string;
}

interface ExportAllButtonProps {
  personId: string;
  personName: string;
  personType: "student" | "teacher";
  documents: DocumentForExport[];
}

export function ExportAllButton({
  personName,
  personType,
  documents,
}: ExportAllButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (documents.length === 0) {
      toast({
        title: "No documents to export",
        description: "This person has no uploaded documents.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    const zip = new JSZip();

    try {
      for (const doc of documents) {
        if (!doc.id) continue;

        try {
          const { url } = await documentService.getDownloadUrl(doc.id);
          const response = await fetch(url);
          if (!response.ok) throw new Error('Download failed');
          const blob = await response.blob();

          const fileName = doc.fileName || `${doc.name}.pdf`;
          zip.file(fileName, blob);
        } catch (err) {
          console.error(`Error downloading ${doc.name}:`, err);
          continue;
        }
      }

      // Generate and download the zip
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${personName}_Documents.zip`);

      toast({
        title: "Export complete",
        description: `Downloaded ${documents.length} document(s) as ZIP.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the documents.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={exporting || documents.length === 0} className="gap-2">
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export All
        </>
      )}
    </Button>
  );
}
