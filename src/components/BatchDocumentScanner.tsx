import { useState, useCallback } from "react";
import { documentService } from "@/services/documentService";
import { storageService } from "@/services/storageService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CameraCapture } from "./CameraCapture";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Scan,
  FolderOpen,
  User,
  Calendar,
  Camera,
} from "lucide-react";

interface ScanResult {
  expirationDate: string | null;
  documentType: string;
  studentName?: {
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
  };
  confidence: number;
  qualityIssues: string[];
  textSummary: string;
}

interface ScannedDocument {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "scanning" | "scanned" | "error" | "uploading" | "uploaded";
  scanResult?: ScanResult;
  error?: string;
  matchedStudent?: any;
  suggestedCategory?: string;
}

interface BatchDocumentScannerProps {
  students: any[];
  onComplete: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: "Immunization Records",
  health_forms: "Health Forms",
  emergency_contacts: "Emergency Contacts",
  birth_certificate: "Birth Certificate",
  proof_of_residence: "Proof of Residence",
  medical_records: "Medical Records",
};

export const BatchDocumentScanner = ({
  students,
  onComplete,
}: BatchDocumentScannerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const isMobile = useIsMobile();

  const matchStudentByName = (scanResult: ScanResult): any | undefined => {
    if (!scanResult.studentName?.fullName && !scanResult.studentName?.firstName) {
      return undefined;
    }

    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, " ");
    
    // Try exact full name match first
    if (scanResult.studentName?.fullName) {
      const extractedFull = normalize(scanResult.studentName.fullName);
      const exactMatch = students.find((s) => {
        const studentFull = normalize(`${s.first_name} ${s.last_name}`);
        return studentFull === extractedFull;
      });
      if (exactMatch) return exactMatch;
    }

    // Try first + last name match
    if (scanResult.studentName?.firstName && scanResult.studentName?.lastName) {
      const firstName = normalize(scanResult.studentName.firstName);
      const lastName = normalize(scanResult.studentName.lastName);
      const match = students.find((s) => 
        normalize(s.first_name) === firstName && 
        normalize(s.last_name) === lastName
      );
      if (match) return match;
    }

    // Try fuzzy matching on full name
    if (scanResult.studentName?.fullName) {
      const extractedFull = normalize(scanResult.studentName.fullName);
      const fuzzyMatch = students.find((s) => {
        const studentFull = normalize(`${s.first_name} ${s.last_name}`);
        return (
          extractedFull.includes(studentFull) ||
          studentFull.includes(extractedFull) ||
          extractedFull.split(" ").some((word) => 
            studentFull.includes(word) && word.length > 2
          )
        );
      });
      if (fuzzyMatch) return fuzzyMatch;
    }

    return undefined;
  };

  const mapDocumentTypeToCategory = (docType: string): string | undefined => {
    const typeMap: Record<string, string> = {
      immunization_record: "immunization_records",
      immunization_records: "immunization_records",
      immunization: "immunization_records",
      vaccination: "immunization_records",
      vaccine: "immunization_records",
      health_form: "health_forms",
      health_forms: "health_forms",
      medical_form: "health_forms",
      physical_exam: "health_forms",
      emergency_contact: "emergency_contacts",
      emergency_contacts: "emergency_contacts",
      emergency_form: "emergency_contacts",
      birth_certificate: "birth_certificate",
      birth_record: "birth_certificate",
      proof_of_residence: "proof_of_residence",
      address_verification: "proof_of_residence",
      utility_bill: "proof_of_residence",
      medical_record: "medical_records",
      medical_records: "medical_records",
      doctor_note: "medical_records",
      prescription: "medical_records",
    };

    const normalized = docType.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    return typeMap[normalized];
  };

  const handleFilesSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((f) =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    );

    const newDocs: ScannedDocument[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      status: "pending",
    }));

    setDocuments((prev) => [...prev, ...newDocs]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelect(e.dataTransfer.files);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const scanDocument = async (doc: ScannedDocument): Promise<ScannedDocument> => {
    try {
      // TODO: Re-enable when AI scan-document endpoint is available
      const data: ScanResult = {
        expirationDate: null,
        documentType: "unknown",
        confidence: 0,
        qualityIssues: ["AI scanning is not currently available"],
        textSummary: "Document requires manual classification",
      };

      const matchedStudent = matchStudentByName(data);
      const suggestedCategory = mapDocumentTypeToCategory(data.documentType);

      return {
        ...doc,
        status: "scanned",
        scanResult: data,
        matchedStudent,
        suggestedCategory,
      };
    } catch (err: any) {
      return { ...doc, status: "error", error: err.message };
    }
  };

  const processAllDocuments = async () => {
    setIsProcessing(true);
    const pendingDocs = documents.filter((d) => d.status === "pending");

    for (let i = 0; i < pendingDocs.length; i++) {
      const doc = pendingDocs[i];
      
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "scanning" } : d))
      );

      const scannedDoc = await scanDocument(doc);
      
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? scannedDoc : d))
      );

      // Small delay between scans to avoid rate limiting
      if (i < pendingDocs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    toast({
      title: "Scanning complete",
      description: `Processed ${pendingDocs.length} documents`,
    });
  };

  const uploadDocument = async (doc: ScannedDocument) => {
    if (!user || !doc.matchedStudent || !doc.suggestedCategory) return;

    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: "uploading" } : d))
    );

    try {
      const presignData = await documentService.presign({
        documentTypeId: doc.suggestedCategory,
        ownerUserId: doc.matchedStudent.id,
        fileName: doc.file.name,
        mimeType: doc.file.type,
        sizeBytes: doc.file.size,
      });

      await storageService.uploadFile(presignData.presignedUrl, doc.file);

      await documentService.complete({
        documentTypeId: doc.suggestedCategory,
        ownerUserId: doc.matchedStudent.id,
        s3Key: presignData.s3Key,
        fileName: doc.file.name,
        mimeType: doc.file.type,
        sizeBytes: doc.file.size,
        notes: `AI Scan Summary: ${doc.scanResult?.textSummary || ""}`,
      });

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "uploaded" } : d))
      );

      toast({
        title: "Document uploaded",
        description: `${doc.file.name} uploaded for ${doc.matchedStudent.first_name}`,
      });
    } catch (err: any) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, status: "error", error: err.message } : d
        )
      );
    }
  };

  const uploadAllReady = async () => {
    const readyDocs = documents.filter(
      (d) => d.status === "scanned" && d.matchedStudent && d.suggestedCategory
    );

    for (const doc of readyDocs) {
      await uploadDocument(doc);
    }

    if (readyDocs.length > 0) {
      onComplete();
    }
  };

  const scannedCount = documents.filter((d) => d.status === "scanned").length;
  const readyCount = documents.filter(
    (d) => d.status === "scanned" && d.matchedStudent && d.suggestedCategory
  ).length;
  const uploadedCount = documents.filter((d) => d.status === "uploaded").length;
  const progress = documents.length > 0 
    ? ((scannedCount + uploadedCount) / documents.length) * 100 
    : 0;

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    const preview = URL.createObjectURL(file);
    const newDoc: ScannedDocument = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview,
      status: "pending",
    };
    setDocuments((prev) => [...prev, newDoc]);
    toast({
      title: "Photo captured",
      description: "Document added to batch. Click 'Scan All' to process.",
    });
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={`p-8 border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">Drop documents here or click to browse</p>
            <p className="text-sm text-muted-foreground">
              Upload multiple documents at once for batch processing
            </p>
          </div>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            id="batch-upload"
            onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
          />
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" asChild>
              <label htmlFor="batch-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </label>
            </Button>
            {isMobile && (
              <Button variant="outline" onClick={() => setShowCamera(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Use Camera
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Progress */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{scannedCount + uploadedCount} of {documents.length} processed</span>
            <span>{readyCount} ready to upload</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {doc.preview ? (
                      <img src={doc.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{doc.file.name}</p>
                      {doc.status === "scanning" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {doc.status === "scanned" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {doc.status === "error" && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      {doc.status === "uploading" && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                      {doc.status === "uploaded" && (
                        <Badge variant="default" className="bg-green-600">Uploaded</Badge>
                      )}
                    </div>

                    {doc.error && (
                      <p className="text-sm text-destructive">{doc.error}</p>
                    )}

                    {doc.scanResult && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {doc.matchedStudent ? (
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />
                            {doc.matchedStudent.first_name} {doc.matchedStudent.last_name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            No student match
                          </Badge>
                        )}

                        {doc.suggestedCategory ? (
                          <Badge variant="outline" className="gap-1">
                            <FolderOpen className="h-3 w-3" />
                            {CATEGORY_LABELS[doc.suggestedCategory]}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Unknown type
                          </Badge>
                        )}

                        {doc.scanResult.expirationDate && (
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            Exp: {new Date(doc.scanResult.expirationDate).toLocaleDateString()}
                          </Badge>
                        )}

                        <Badge 
                          variant={doc.scanResult.confidence >= 80 ? "default" : "secondary"}
                        >
                          {doc.scanResult.confidence}% confidence
                        </Badge>
                      </div>
                    )}

                    {doc.scanResult?.qualityIssues?.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Issues: {doc.scanResult.qualityIssues.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {doc.status === "scanned" && doc.matchedStudent && doc.suggestedCategory && (
                      <Button
                        size="sm"
                        onClick={() => uploadDocument(doc)}
                        disabled={isProcessing}
                      >
                        Upload
                      </Button>
                    )}
                    {doc.status !== "uploaded" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Action Buttons */}
      {documents.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={processAllDocuments}
            disabled={isProcessing || documents.filter((d) => d.status === "pending").length === 0}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Scan All ({documents.filter((d) => d.status === "pending").length})
              </>
            )}
          </Button>

          <Button
            onClick={uploadAllReady}
            disabled={readyCount === 0 || isProcessing}
            variant="secondary"
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Ready ({readyCount})
          </Button>
        </div>
      )}
    </div>
  );
};
