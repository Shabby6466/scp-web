import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CameraCapture } from "./CameraCapture";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Camera,
  Scan,
} from "lucide-react";

interface ScanResult {
  expirationDate: string | null;
  issueDate: string | null;
  verificationDate: string | null;
  birthDate: string | null;
  studentName?: {
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    fullName: string | null;
  };
  parentInfo?: {
    primaryParent: {
      name: string | null;
      relationship: string | null;
    };
    secondaryParent: {
      name: string | null;
      relationship: string | null;
    };
  };
  address?: {
    street: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    fullAddress: string | null;
  };
  contactInfo?: {
    homePhone: string | null;
    mobilePhone: string | null;
    email: string | null;
    emergencyPhone: string | null;
  };
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
  medicalInfo?: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    doctorName: string | null;
    doctorPhone: string | null;
  };
  documentType: string;
  qualityIssues: string[];
  missingInfo: string[];
  dataValidation?: string[];
  complianceIssues?: string[];
  textSummary: string;
  confidence: number;
  recommendedActions?: string[];
}

interface DocumentScanUploadProps {
  studentId: string;
  onScanComplete?: (result: ScanResult & { file: File }) => void;
}

export const DocumentScanUpload = ({
  studentId,
  onScanComplete,
}: DocumentScanUploadProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setScanResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleCameraCapture = (capturedFile: File) => {
    setShowCamera(false);
    setFile(capturedFile);
    setScanResult(null);
    setPreview(URL.createObjectURL(capturedFile));
    toast({
      title: "Photo captured",
      description: "Document ready to scan",
    });
  };

  const handleScan = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a document to scan",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    try {
      // TODO: Re-enable when AI scan-document endpoint is available
      const data: ScanResult = {
        expirationDate: null,
        issueDate: null,
        verificationDate: null,
        birthDate: null,
        documentType: "unknown",
        qualityIssues: ["AI scanning is not currently available"],
        missingInfo: [],
        textSummary: "Document requires manual review — AI scanning is not yet enabled.",
        confidence: 0,
      };

      setScanResult(data);

      toast({
        title: "Scan unavailable",
        description: "AI scanning is not currently enabled. Please classify the document manually.",
      });

      if (onScanComplete) {
        onScanComplete({ ...data, file });
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Could not scan document",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const getQualityBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default">High Quality</Badge>;
    if (confidence >= 60) return <Badge variant="secondary">Good Quality</Badge>;
    return <Badge variant="destructive">Low Quality</Badge>;
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
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Smart Document Scanner</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Upload Document</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  id="document"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={scanning}
                />
              </div>
              {isMobile && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  disabled={scanning}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a clear photo or use camera to capture
            </p>
          </div>

          {preview && (
            <div className="border rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Document preview"
                className="w-full h-64 object-contain bg-muted"
              />
            </div>
          )}

          <Button
            onClick={handleScan}
            disabled={!file || scanning}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scanning Document...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Scan & Analyze
              </>
            )}
          </Button>
        </div>
      </Card>

      {scanResult && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Scan Results
            </h4>
            {getQualityBadge(scanResult.confidence)}
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Document Type:</span>{" "}
              <Badge variant="outline">{scanResult.documentType}</Badge>
            </div>

            {scanResult.expirationDate && (
              <div>
                <span className="font-medium">Expiration Date:</span>{" "}
                <span className="text-foreground">
                  {new Date(scanResult.expirationDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {scanResult.issueDate && (
              <div>
                <span className="font-medium">Issue Date:</span>{" "}
                <span className="text-foreground">
                  {new Date(scanResult.issueDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {scanResult.verificationDate && (
              <div>
                <span className="font-medium">Verification Date:</span>{" "}
                <span className="text-foreground">
                  {new Date(scanResult.verificationDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {scanResult.birthDate && (
              <div>
                <span className="font-medium">Birth Date:</span>{" "}
                <span className="text-foreground">
                  {new Date(scanResult.birthDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {scanResult.studentName?.fullName && (
              <div>
                <span className="font-medium">Student Name:</span>{" "}
                <span className="text-foreground">
                  {scanResult.studentName.fullName}
                </span>
              </div>
            )}

            {scanResult.address?.fullAddress && (
              <div>
                <span className="font-medium">Address:</span>{" "}
                <span className="text-foreground">
                  {scanResult.address.fullAddress}
                </span>
              </div>
            )}

            {scanResult.contactInfo?.homePhone && (
              <div>
                <span className="font-medium">Phone:</span>{" "}
                <span className="text-foreground">
                  {scanResult.contactInfo.homePhone}
                </span>
              </div>
            )}

            {scanResult.parentInfo?.primaryParent?.name && (
              <div>
                <span className="font-medium">Parent/Guardian:</span>{" "}
                <span className="text-foreground">
                  {scanResult.parentInfo.primaryParent.name}
                  {scanResult.parentInfo.primaryParent.relationship && 
                    ` (${scanResult.parentInfo.primaryParent.relationship})`}
                </span>
              </div>
            )}

            {scanResult.emergencyContacts && scanResult.emergencyContacts.length > 0 && (
              <div>
                <span className="font-medium">Emergency Contacts:</span>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {scanResult.emergencyContacts.map((contact, i) => (
                    <li key={i}>
                      {contact.name} ({contact.relationship}) - {contact.phone}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scanResult.medicalInfo && (scanResult.medicalInfo.allergies?.length > 0 || 
              scanResult.medicalInfo.medications?.length > 0 || 
              scanResult.medicalInfo.conditions?.length > 0) && (
              <div>
                <span className="font-medium">Medical Information:</span>
                <div className="text-muted-foreground mt-1 space-y-1">
                  {scanResult.medicalInfo.allergies?.length > 0 && (
                    <div>Allergies: {scanResult.medicalInfo.allergies.join(", ")}</div>
                  )}
                  {scanResult.medicalInfo.medications?.length > 0 && (
                    <div>Medications: {scanResult.medicalInfo.medications.join(", ")}</div>
                  )}
                  {scanResult.medicalInfo.conditions?.length > 0 && (
                    <div>Conditions: {scanResult.medicalInfo.conditions.join(", ")}</div>
                  )}
                </div>
              </div>
            )}

            {scanResult.textSummary && (
              <div>
                <span className="font-medium">Summary:</span>
                <p className="text-muted-foreground mt-1">
                  {scanResult.textSummary}
                </p>
              </div>
            )}

            {scanResult.qualityIssues.length > 0 && (
              <div>
                <span className="font-medium flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Quality Issues:
                </span>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {scanResult.qualityIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {scanResult.missingInfo.length > 0 && (
              <div>
                <span className="font-medium flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Missing Information:
                </span>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {scanResult.missingInfo.map((info, i) => (
                    <li key={i}>{info}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Confidence: {scanResult.confidence}%
          </div>
        </Card>
      )}
    </div>
  );
};
