import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { documentService } from '@/services/documentService';
import { ApiError } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  Loader2,
  Eye,
  Calendar,
  User,
  FileImage,
  Download,
  ExternalLink,
} from 'lucide-react';
import { isPdfFile, isImageFile } from '@/utils/pdfToImage';
import PdfViewer from '@/components/PdfViewer';

interface DocumentReviewDialogProps {
  document: (Record<string, any> & { students?: Record<string, any> | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete: () => void;
}

interface AuthenticationAnalysis {
  authenticityScore: number;
  isAuthentic: boolean;
  forgeryIndicators: string[];
  qualityIssues: string[];
  extractedData: Record<string, any>;
  complianceIssues: string[];
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  isPdf?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

function getDocumentFileName(doc: Record<string, unknown>): string {
  const n = doc.file_name ?? doc.fileName;
  return typeof n === 'string' ? n : '';
}

const DocumentReviewDialog = ({
  document,
  open,
  onOpenChange,
  onReviewComplete,
}: DocumentReviewDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [processing, setProcessing] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authentication, setAuthentication] = useState<AuthenticationAnalysis | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (document && open) {
      loadDocumentUrl();
      setRejectionReason('');
      setAuthentication(null);
      // Pre-fill expiration date if it exists
      setExpirationDate(document.expiration_date || '');
    }
  }, [document, open]);

  const loadDocumentUrl = async () => {
    if (!document) return;

    try {
      const data = await documentService.getDownloadUrl(document.id);
      setFileUrl(data.url || data.signedUrl);
    } catch (error: unknown) {
      console.error('Failed to load document URL:', error);
      const status = error instanceof ApiError ? error.status : undefined;
      const description =
        error instanceof Error ? error.message : 'Failed to load preview URL';
      toast({
        variant: 'destructive',
        title: status === 503 ? 'File storage not configured' : 'Preview unavailable',
        description,
      });
    }
  };

  const authenticateDocument = async () => {
    if (!document || !fileUrl) return;

    if (isPdfFile(getDocumentFileName(document as Record<string, unknown>))) {
      setAuthentication({
        authenticityScore: 50,
        isAuthentic: true,
        forgeryIndicators: [],
        qualityIssues: ['PDF documents require manual review'],
        extractedData: {},
        complianceIssues: [],
        recommendation: 'REVIEW',
        reasoning: 'PDF documents cannot be analyzed by AI vision. Please review the document manually using the preview tab, or request the parent to upload an image version (JPG, PNG) for automated analysis.',
        confidence: 'low',
        isPdf: true,
      });
      toast({
        title: 'PDF Document',
        description: 'PDFs require manual review. AI analysis works best with image files.',
      });
      return;
    }

    setAuthenticating(true);
    try {
      // TODO: Re-enable when AI authenticate-document endpoint is available
      const stubAnalysis: AuthenticationAnalysis = {
        authenticityScore: 50,
        isAuthentic: true,
        forgeryIndicators: [],
        qualityIssues: ['AI authentication is not currently available — manual review required'],
        extractedData: {},
        complianceIssues: [],
        recommendation: 'REVIEW',
        reasoning: 'AI document authentication is not yet enabled. Please review the document manually.',
        confidence: 'low',
      };

      setAuthentication(stubAnalysis);
      toast({
        title: 'Manual Review Required',
        description: 'AI authentication is not currently available. Please review manually.',
      });
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'Failed to authenticate document',
      });
    } finally {
      setAuthenticating(false);
    }
  };

  const handleApprove = async () => {
    if (!document || !user) return;

    setProcessing(true);
    try {
      await documentService.review(document.id, { status: 'APPROVED' });

      toast({
        title: 'Document Approved',
        description: 'The document has been approved successfully.',
      });

      onOpenChange(false);
      onReviewComplete();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to approve document',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!document || !user) return;

    if (!rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejecting this document.',
      });
      return;
    }

    setProcessing(true);
    try {
      await documentService.review(document.id, {
        status: 'REJECTED',
        rejectionReason,
      });

      toast({
        title: 'Document Rejected',
        description: 'The document has been rejected.',
      });

      onOpenChange(false);
      onReviewComplete();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to reject document',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!document) return null;

  const docFileName = getDocumentFileName(document as Record<string, unknown>);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: string): 'default' | 'destructive' | 'secondary' => {
    const colors: Record<string, 'default' | 'destructive' | 'secondary'> = {
      high: 'default',
      medium: 'secondary',
      low: 'destructive',
    };
    return colors[confidence] || 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Document: {docFileName || 'Document'}
          </DialogTitle>
          <DialogDescription>
            {CATEGORY_LABELS[document.category] ?? document.category ?? 'Document'}
            {document.students && (
              <span className="ml-2">
                • {document.students.first_name} {document.students.last_name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="authentication">
              <Shield className="h-4 w-4 mr-2" />
              Authentication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            {fileUrl && (
              <div className="h-full bg-muted rounded-lg overflow-hidden">
                {isPdfFile(docFileName) ? (
                  <PdfViewer url={fileUrl} className="h-full" />
                ) : (
                  <div className="h-full p-4 flex items-center justify-center">
                    <img
                      src={fileUrl}
                      alt={docFileName || 'Document'}
                      className="max-w-full max-h-full mx-auto object-contain rounded shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {CATEGORY_LABELS[document.category] ?? document.category ?? '—'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm text-muted-foreground mt-1 capitalize">
                  {document.status}
                </p>
              </div>
              {document.students && (
                <>
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Student
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {document.students.first_name} {document.students.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {document.students.date_of_birth
                        ? new Date(document.students.date_of_birth).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </>
              )}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Uploaded
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(document.created_at).toLocaleString()}
                </p>
              </div>
              {document.expiration_date && (
                <div>
                  <Label className="text-sm font-medium">Expiration Date</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(document.expiration_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">File Size</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {((Number(document.file_size) || 0) / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {document.notes && (
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                  {document.notes}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="authentication" className="flex-1 overflow-auto mt-4 space-y-4">
            {!authentication ? (
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Use AI to authenticate this document and detect potential forgeries
                </p>
                {isPdfFile(docFileName) && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg py-2 px-4 max-w-md mx-auto">
                    <FileText className="h-4 w-4" />
                    <span>PDF files require manual review - AI analysis works best with images</span>
                  </div>
                )}
                <Button
                  onClick={authenticateDocument}
                  disabled={authenticating}
                  size="lg"
                >
                  {authenticating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      {isPdfFile(docFileName) ? 'Review PDF Document' : 'Authenticate Document'}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Authenticity Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Authenticity Score</Label>
                    <span className={`text-2xl font-bold ${getScoreColor(authentication.authenticityScore)}`}>
                      {authentication.authenticityScore}%
                    </span>
                  </div>
                  <Progress value={authentication.authenticityScore} className="h-3" />
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getConfidenceBadge(authentication.confidence)}>
                      {authentication.confidence} confidence
                    </Badge>
                    <Badge variant={authentication.isAuthentic ? 'default' : 'destructive'}>
                      {authentication.isAuthentic ? 'Likely Authentic' : 'Suspicious'}
                    </Badge>
                  </div>
                </div>

                {/* Recommendation */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>AI Recommendation: {authentication.recommendation}</strong>
                    <p className="mt-2 text-sm">{authentication.reasoning}</p>
                  </AlertDescription>
                </Alert>

                {/* Forgery Indicators */}
                {authentication.forgeryIndicators.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 text-destructive mb-2">
                      <XCircle className="h-4 w-4" />
                      Forgery Indicators ({authentication.forgeryIndicators.length})
                    </Label>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {authentication.forgeryIndicators.map((indicator, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-destructive mt-1">•</span>
                          <span>{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quality Issues */}
                {authentication.qualityIssues.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Quality Issues ({authentication.qualityIssues.length})
                    </Label>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {authentication.qualityIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compliance Issues */}
                {authentication.complianceIssues.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Compliance Issues ({authentication.complianceIssues.length})
                    </Label>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {authentication.complianceIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extracted Data */}
                {Object.keys(authentication.extractedData).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2">Extracted Information</Label>
                    <div className="bg-muted p-3 rounded text-sm space-y-1">
                      {Object.entries(authentication.extractedData).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          {document.status === 'pending' && (
            <div className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiration-date">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Expiration Date (optional)
                  </Label>
                  <Input
                    id="expiration-date"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason (optional for approval, required for rejection)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Provide detailed feedback about the document..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentReviewDialog;
