import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Scan, CheckCircle2, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { DocumentScanUpload } from './DocumentScanUpload';
import { DocumentVerificationAlert } from './DocumentVerificationAlert';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const uploadSchema = z.object({
  studentId: z.string().min(1, 'Please select a student'),
  category: z.enum([
    'immunization_records',
    'health_forms',
    'emergency_contacts',
    'birth_certificate',
    'proof_of_residence',
    'medical_records',
  ]),
  notes: z.string().max(500).optional(),
  expirationDate: z.string().optional(),
  file: z.any().refine((file) => file instanceof File, 'Please select a file'),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface DocumentUploadDialogProps {
  students: any[];
  onDocumentUploaded: () => void;
  children?: React.ReactNode;
  defaultStudentId?: string;
}

interface ScanResultData {
  expirationDate?: string | null;
  issueDate?: string | null;
  verificationDate?: string | null;
  birthDate?: string | null;
  studentName?: {
    firstName?: string | null;
    lastName?: string | null;
    middleName?: string | null;
    fullName?: string | null;
  };
  parentInfo?: {
    primaryParent?: { name?: string | null; relationship?: string | null };
    secondaryParent?: { name?: string | null; relationship?: string | null };
  };
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    fullAddress?: string | null;
  };
  contactInfo?: {
    homePhone?: string | null;
    mobilePhone?: string | null;
    email?: string | null;
    emergencyPhone?: string | null;
  };
  emergencyContacts?: Array<{ name: string; relationship: string; phone: string }>;
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    doctorName?: string | null;
    doctorPhone?: string | null;
  };
  documentType?: string;
  qualityIssues?: string[];
  missingInfo?: string[];
  dataValidation?: string[];
  complianceIssues?: string[];
  textSummary?: string;
  confidence?: number;
  recommendedActions?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

const DocumentUploadDialog = ({ 
  students, 
  onDocumentUploaded, 
  children,
  defaultStudentId 
}: DocumentUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('manual');
  const [isDragging, setIsDragging] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [overallMatch, setOverallMatch] = useState(true);
  const [autoScanning, setAutoScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const { user } = useAuth();
  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      studentId: defaultStudentId || '',
    }
  });

  // Update form when defaultStudentId changes
  useEffect(() => {
    if (defaultStudentId) {
      form.setValue('studentId', defaultStudentId);
    }
  }, [defaultStudentId, form]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFileSelected(file);
    }
  };

  const verifyDocumentData = useCallback((scanData: any, studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return { results: [], overallMatch: true };
    }

    const results: any[] = [];
    let hasErrors = false;

    // Helper function to normalize strings for comparison
    const normalize = (str: string | null | undefined) => 
      (str || '').toLowerCase().trim().replace(/\s+/g, ' ');

    // Simple edit distance calculation
    const editDistance = (s1: string, s2: string): number => {
      const costs: number[] = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };

    // Helper function to calculate similarity score
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = normalize(str1);
      const s2 = normalize(str2);
      if (s1 === s2) return 1;
      if (s1.includes(s2) || s2.includes(s1)) return 0.8;
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      const longerLength = longer.length;
      if (longerLength === 0) return 1.0;
      return (longerLength - editDistance(longer, shorter)) / longerLength;
    };

    // Verify student name
    if (scanData.studentName?.fullName) {
      const extractedName = scanData.studentName.fullName;
      const studentFullName = `${student.first_name} ${student.last_name}`;
      const similarity = calculateSimilarity(extractedName, studentFullName);
      const match = similarity >= 0.8;
      results.push({
        field: 'Student Name',
        expected: studentFullName,
        extracted: extractedName,
        match,
        severity: similarity < 0.5 ? 'error' : (match ? 'info' : 'warning')
      });
      if (!match && similarity < 0.5) hasErrors = true;
    }

    // Verify birth date
    if (scanData.birthDate) {
      const extractedDate = new Date(scanData.birthDate).toISOString().split('T')[0];
      const studentDob = student.date_of_birth;
      const match = extractedDate === studentDob;
      results.push({
        field: 'Date of Birth',
        expected: new Date(studentDob).toLocaleDateString(),
        extracted: new Date(scanData.birthDate).toLocaleDateString(),
        match,
        severity: match ? 'info' : 'error'
      });
      if (!match) hasErrors = true;
    }

    // Verify first name
    if (scanData.studentName?.firstName) {
      const similarity = calculateSimilarity(scanData.studentName.firstName, student.first_name);
      const match = similarity >= 0.8;
      if (similarity < 1.0) {
        results.push({
          field: 'First Name',
          expected: student.first_name,
          extracted: scanData.studentName.firstName,
          match,
          severity: similarity < 0.5 ? 'error' : (match ? 'info' : 'warning')
        });
      }
    }

    // Verify last name
    if (scanData.studentName?.lastName) {
      const similarity = calculateSimilarity(scanData.studentName.lastName, student.last_name);
      const match = similarity >= 0.8;
      if (similarity < 1.0) {
        results.push({
          field: 'Last Name',
          expected: student.last_name,
          extracted: scanData.studentName.lastName,
          match,
          severity: similarity < 0.5 ? 'error' : (match ? 'info' : 'warning')
        });
      }
    }

    return { results, overallMatch: !hasErrors };
  }, [students]);

  // Auto-scan function for manual upload tab
  const performAutoScan = useCallback(async (file: File) => {
    // Only auto-scan images, not PDFs or docs
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'File added',
        description: `${file.name} is ready to upload. Auto-scan is only available for images.`,
      });
      return;
    }

    setAutoScanning(true);
    setScanResult(null);
    setVerificationResults([]);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await api.post('/documents/scan', {
        imageBase64: base64,
        documentCategory: 'student_document',
      });

      if (data.error) throw new Error(data.error);

      setScanResult(data);

      // Auto-populate form fields
      if (data.expirationDate) {
        form.setValue('expirationDate', data.expirationDate);
      }

      // Auto-select category
      const detectedCategory = data.documentType?.toLowerCase().replace(/\s+/g, '_');
      if (detectedCategory && Object.keys(CATEGORY_LABELS).includes(detectedCategory)) {
        form.setValue('category', detectedCategory as any);
      }

      // Build notes
      const noteParts: string[] = ['AI SCAN RESULTS:', ''];
      if (data.studentName?.fullName) noteParts.push(`Student Name: ${data.studentName.fullName}`);
      if (data.birthDate) noteParts.push(`Birth Date: ${new Date(data.birthDate).toLocaleDateString()}`);
      if (data.address?.fullAddress) noteParts.push(`Address: ${data.address.fullAddress}`);
      if (data.textSummary) {
        noteParts.push('');
        noteParts.push(`Summary: ${data.textSummary}`);
      }
      if (data.qualityIssues?.length > 0) {
        noteParts.push('');
        noteParts.push('Quality Issues: ' + data.qualityIssues.join(', '));
      }
      form.setValue('notes', noteParts.join('\n'));

      // Verify against student record
      const selectedStudentId = form.getValues('studentId');
      if (selectedStudentId) {
        const verification = verifyDocumentData(data, selectedStudentId);
        setVerificationResults(verification.results);
        setOverallMatch(verification.overallMatch);
      }

      toast({
        title: 'Auto-scan complete!',
        description: `Document analyzed with ${data.confidence}% confidence`,
      });
    } catch (error: any) {
      console.error('Auto-scan error:', error);
      toast({
        title: 'Auto-scan failed',
        description: 'You can still upload the document manually',
        variant: 'destructive',
      });
    } finally {
      setAutoScanning(false);
    }
  }, [form, verifyDocumentData]);

  // Handle file selection (both drag-drop and click)
  const handleFileSelected = useCallback((file: File) => {
    form.setValue('file', file);
    performAutoScan(file);
  }, [form, performAutoScan]);

  const handleScanComplete = (scanResult: any) => {
    // Auto-populate form fields from scan results
    if (scanResult.expirationDate) {
      form.setValue('expirationDate', scanResult.expirationDate);
    }
    if (scanResult.file) {
      form.setValue('file', scanResult.file);
    }
    
    // Auto-select category if detected
    const detectedCategory = scanResult.documentType?.toLowerCase().replace(/\s+/g, '_');
    if (detectedCategory && Object.keys(CATEGORY_LABELS).includes(detectedCategory)) {
      form.setValue('category', detectedCategory as any);
    }
    
    // Build comprehensive notes with all extracted information
    const noteParts: string[] = ['AI SCAN RESULTS:', ''];
    
    // Personal Information
    if (scanResult.studentName?.fullName) {
      noteParts.push(`Student Name: ${scanResult.studentName.fullName}`);
    }
    
    if (scanResult.birthDate) {
      noteParts.push(`Birth Date: ${new Date(scanResult.birthDate).toLocaleDateString()}`);
    }
    
    if (scanResult.address?.fullAddress) {
      noteParts.push(`Address: ${scanResult.address.fullAddress}`);
    }
    
    if (scanResult.contactInfo) {
      const contacts: string[] = [];
      if (scanResult.contactInfo.homePhone) contacts.push(`Home: ${scanResult.contactInfo.homePhone}`);
      if (scanResult.contactInfo.mobilePhone) contacts.push(`Mobile: ${scanResult.contactInfo.mobilePhone}`);
      if (scanResult.contactInfo.email) contacts.push(`Email: ${scanResult.contactInfo.email}`);
      if (contacts.length > 0) {
        noteParts.push(`Contact: ${contacts.join(', ')}`);
      }
    }
    
    if (scanResult.parentInfo?.primaryParent?.name) {
      noteParts.push(`Parent/Guardian: ${scanResult.parentInfo.primaryParent.name}${scanResult.parentInfo.primaryParent.relationship ? ` (${scanResult.parentInfo.primaryParent.relationship})` : ''}`);
    }
    
    if (scanResult.emergencyContacts?.length > 0) {
      noteParts.push('');
      noteParts.push('Emergency Contacts:');
      scanResult.emergencyContacts.forEach((contact: any) => {
        noteParts.push(`  • ${contact.name} (${contact.relationship}) - ${contact.phone}`);
      });
    }
    
    // Medical Information
    if (scanResult.medicalInfo) {
      const medicalParts: string[] = [];
      if (scanResult.medicalInfo.allergies?.length > 0) {
        medicalParts.push(`Allergies: ${scanResult.medicalInfo.allergies.join(', ')}`);
      }
      if (scanResult.medicalInfo.medications?.length > 0) {
        medicalParts.push(`Medications: ${scanResult.medicalInfo.medications.join(', ')}`);
      }
      if (scanResult.medicalInfo.conditions?.length > 0) {
        medicalParts.push(`Conditions: ${scanResult.medicalInfo.conditions.join(', ')}`);
      }
      if (scanResult.medicalInfo.doctorName) {
        medicalParts.push(`Doctor: ${scanResult.medicalInfo.doctorName}${scanResult.medicalInfo.doctorPhone ? ` (${scanResult.medicalInfo.doctorPhone})` : ''}`);
      }
      if (medicalParts.length > 0) {
        noteParts.push('');
        noteParts.push('Medical Information:');
        medicalParts.forEach(part => noteParts.push(`  ${part}`));
      }
    }
    
    // Dates
    noteParts.push('');
    if (scanResult.issueDate) {
      noteParts.push(`Issue Date: ${new Date(scanResult.issueDate).toLocaleDateString()}`);
    }
    
    if (scanResult.verificationDate) {
      noteParts.push(`Verification Date: ${new Date(scanResult.verificationDate).toLocaleDateString()}`);
    }
    
    // Summary
    if (scanResult.textSummary) {
      noteParts.push('');
      noteParts.push('Summary:');
      noteParts.push(scanResult.textSummary);
    }
    
    // Validation and Issues
    if (scanResult.dataValidation?.length > 0) {
      noteParts.push('');
      noteParts.push('Data Validation:');
      scanResult.dataValidation.forEach((item: string) => noteParts.push(`  • ${item}`));
    }
    
    if (scanResult.complianceIssues?.length > 0) {
      noteParts.push('');
      noteParts.push('Compliance Issues:');
      scanResult.complianceIssues.forEach((item: string) => noteParts.push(`  • ${item}`));
    }
    
    if (scanResult.qualityIssues?.length > 0) {
      noteParts.push('');
      noteParts.push('Quality Issues:');
      scanResult.qualityIssues.forEach((item: string) => noteParts.push(`  • ${item}`));
    }
    
    if (scanResult.recommendedActions?.length > 0) {
      noteParts.push('');
      noteParts.push('Recommended Actions:');
      scanResult.recommendedActions.forEach((item: string) => noteParts.push(`  • ${item}`));
    }
    
    form.setValue('notes', noteParts.join('\n'));

    // Verify extracted data against student records
    const selectedStudentId = form.watch('studentId');
    if (selectedStudentId) {
      const verification = verifyDocumentData(scanResult, selectedStudentId);
      setVerificationResults(verification.results);
      setOverallMatch(verification.overallMatch);
      
      if (!verification.overallMatch) {
        toast({
          title: 'Verification Issues Found',
          description: 'Please review the mismatches before submitting.',
          variant: 'destructive',
        });
      }
    }

    // Switch to manual tab to review and submit
    setSelectedTab('manual');
    
    toast({
      title: 'Scan complete!',
      description: 'Personal information and dates auto-extracted. Review verification results.',
    });
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!user) return;

    const file = data.file as File;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'File size must be less than 20MB',
      });
      return;
    }

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a PDF, JPG, PNG, or Word document',
      });
      return;
    }

    setUploading(true);

    try {
      const actingUserId = user.id;
      const isChildProfile = data.studentId !== actingUserId;
      const presignData = await documentService.presign({
        documentTypeId: data.category,
        ownerUserId: actingUserId,
        ...(isChildProfile ? { studentProfileId: data.studentId } : {}),
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      await storageService.uploadFile(presignData.presignedUrl, file);

      await documentService.complete({
        documentTypeId: data.category,
        ownerUserId: actingUserId,
        ...(isChildProfile ? { studentProfileId: data.studentId } : {}),
        s3Key: presignData.s3Key,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        notes: data.notes || undefined,
      });

      toast({
        title: 'Document uploaded',
        description: 'Your document has been uploaded successfully.',
      });

      form.reset();
      setOpen(false);
      onDocumentUploaded();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button disabled={students.length === 0}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload documents manually or use smart scan with AI-powered OCR.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Smart Scan
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Manual Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-4">
            {form.watch('studentId') ? (
              <DocumentScanUpload
                studentId={form.watch('studentId')}
                onScanComplete={handleScanComplete}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Please select a student first</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSelectedTab('manual')}
                >
                  Select Student
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            {/* Auto-scan results display */}
            {autoScanning && (
              <Card className="mb-4 p-4 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="font-medium text-sm">Scanning document...</p>
                    <p className="text-xs text-muted-foreground">Extracting information with AI</p>
                  </div>
                </div>
              </Card>
            )}

            {scanResult && !autoScanning && (
              <Card className="mb-4 p-4 border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="font-medium text-sm">Scan Results</span>
                  </div>
                  <Badge variant={scanResult.confidence && scanResult.confidence >= 80 ? 'default' : 'secondary'}>
                    {scanResult.confidence}% confidence
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {scanResult.documentType && (
                    <div>
                      <span className="text-muted-foreground">Type:</span>{' '}
                      <span className="font-medium">{scanResult.documentType}</span>
                    </div>
                  )}
                  {scanResult.studentName?.fullName && (
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-medium">{scanResult.studentName.fullName}</span>
                    </div>
                  )}
                  {scanResult.birthDate && (
                    <div>
                      <span className="text-muted-foreground">DOB:</span>{' '}
                      <span className="font-medium">{new Date(scanResult.birthDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {scanResult.expirationDate && (
                    <div>
                      <span className="text-muted-foreground">Expires:</span>{' '}
                      <span className="font-medium">{new Date(scanResult.expirationDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {scanResult.qualityIssues && scanResult.qualityIssues.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>Quality Issues: {scanResult.qualityIssues.join(', ')}</span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {verificationResults.length > 0 && (
              <div className="mb-4">
                <DocumentVerificationAlert 
                  results={verificationResults}
                  overallMatch={overallMatch}
                />
              </div>
            )}
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">Student</Label>
            <Select onValueChange={(value) => form.setValue('studentId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.studentId && (
              <p className="text-sm text-destructive">{form.formState.errors.studentId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Document Category</Label>
            <Select 
              onValueChange={(value) => form.setValue('category', value as any)}
              value={form.watch('category')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Document File</Label>
            {form.watch('file') ? (
              <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    {autoScanning ? (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-medium truncate">
                        {(form.watch('file') as File)?.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((form.watch('file') as File)?.size / 1024 / 1024).toFixed(2)} MB
                      {autoScanning && ' • Scanning...'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      form.setValue('file', undefined as any);
                      setScanResult(null);
                      setVerificationResults([]);
                    }}
                    disabled={autoScanning}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <label className="text-xs text-primary cursor-pointer hover:underline">
                    Click to change file
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                      className="hidden"
                      disabled={autoScanning}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="font-medium text-primary">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, PNG, Word documents (max 20MB)
                  </p>
                  <p className="text-xs text-primary/70">
                    Images will be auto-scanned for information
                  </p>
                </div>
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}
            {form.formState.errors.file && (
              <p className="text-sm text-destructive">{form.formState.errors.file.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
            <Input
              id="expirationDate"
              type="date"
              {...form.register('expirationDate')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this document..."
              {...form.register('notes')}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={uploading || autoScanning}>
            {uploading ? 'Uploading...' : autoScanning ? 'Scanning...' : 'Upload Document'}
          </Button>
        </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadDialog;
