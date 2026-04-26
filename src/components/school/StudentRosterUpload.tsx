import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, 
  Loader2, X, Users, ChevronDown, ChevronUp 
} from "lucide-react";

interface StudentRosterUploadProps {
  schoolId: string;
  onSuccess?: () => void;
}

interface ParsedStudent {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  childLoginEmail: string;
  classroom?: string;
  parentName?: string;
  parentEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  isValid: boolean;
  errors: string[];
}

interface ColumnMapping {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  childLoginEmail: string;
  classroom: string;
  parentName: string;
  parentEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  firstName: 'child_first_name',
  lastName: 'child_last_name',
  dateOfBirth: 'date_of_birth',
  childLoginEmail: 'student_email',
  classroom: 'classroom',
  parentName: 'parent_name',
  parentEmail: 'parent_email',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactPhone: 'emergency_contact_phone',
};

const COLUMN_ALIASES: Record<string, string[]> = {
  firstName: ['first_name', 'firstname', 'child_first_name', 'student_first_name', 'first'],
  lastName: ['last_name', 'lastname', 'child_last_name', 'student_last_name', 'last', 'surname'],
  dateOfBirth: ['date_of_birth', 'dob', 'birth_date', 'birthdate', 'birthday'],
  childLoginEmail: [
    'student_email',
    'child_email',
    'student_login_email',
    'login_email',
    'student_login',
  ],
  classroom: ['classroom', 'class', 'room', 'grade', 'grade_level'],
  parentName: ['parent_name', 'guardian_name', 'parent', 'guardian'],
  parentEmail: ['parent_email', 'guardian_email', 'email', 'parent_email_address'],
  emergencyContactName: ['emergency_contact_name', 'emergency_name', 'emergency_contact'],
  emergencyContactPhone: ['emergency_contact_phone', 'emergency_phone', 'emergency_number'],
};

const StudentRosterUpload = ({ schoolId, onSuccess }: StudentRosterUploadProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      'child_first_name',
      'child_last_name',
      'date_of_birth',
      'student_email',
      'classroom',
      'parent_name',
      'parent_email',
      'emergency_contact_name',
      'emergency_contact_phone'
    ];
    const sampleRow = [
      'Emma',
      'Johnson',
      '2020-03-15',
      'emma.johnson.student@example.com',
      'Butterflies',
      'Sarah Johnson',
      'sarah.johnson@email.com',
      'Michael Johnson',
      '555-123-4567'
    ];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_roster_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows = lines.slice(1).map(parseRow);
    
    return { headers, rows };
  };

  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const mapping = { ...DEFAULT_MAPPING };
    
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      for (const header of headers) {
        if (aliases.includes(header.toLowerCase())) {
          mapping[field as keyof ColumnMapping] = header;
          break;
        }
      }
    }
    
    return mapping;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    
    try {
      const text = await uploadedFile.text();
      const { headers: parsedHeaders, rows } = parseCSV(text);
      
      if (parsedHeaders.length === 0 || rows.length === 0) {
        toast({
          title: "Empty file",
          description: "The CSV file appears to be empty",
          variant: "destructive",
        });
        return;
      }
      
      setHeaders(parsedHeaders);
      const detectedMapping = autoDetectMapping(parsedHeaders);
      setColumnMapping(detectedMapping);
      
      const students = rows.map(row => parseRowWithMapping(row, parsedHeaders, detectedMapping));
      setParsedData(students);
      setStep('mapping');
      
      toast({
        title: "File parsed successfully",
        description: `Found ${rows.length} students in the roster`,
      });
    } catch (error: any) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Error parsing file",
        description: error.message || "Failed to parse the CSV file",
        variant: "destructive",
      });
    }
  };

  const parseRowWithMapping = (
    row: string[], 
    headers: string[], 
    mapping: ColumnMapping
  ): ParsedStudent => {
    const getValue = (field: keyof ColumnMapping) => {
      const columnName = mapping[field];
      const index = headers.indexOf(columnName);
      return index >= 0 ? row[index] || '' : '';
    };

    const firstName = getValue('firstName').trim();
    const lastName = getValue('lastName').trim();
    const dateOfBirth = getValue('dateOfBirth').trim();
    const childLoginEmail = getValue('childLoginEmail').trim().toLowerCase();

    const errors: string[] = [];
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(childLoginEmail);

    if (!firstName) errors.push('Missing first name');
    if (!lastName) errors.push('Missing last name');
    if (!dateOfBirth) {
      errors.push('Missing date of birth');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateOfBirth)) {
        errors.push('Invalid date format (use YYYY-MM-DD)');
      }
    }
    if (!childLoginEmail) {
      errors.push('Missing student login email');
    } else if (!emailOk) {
      errors.push('Invalid student login email');
    }

    return {
      firstName,
      lastName,
      dateOfBirth,
      childLoginEmail,
      classroom: getValue('classroom').trim() || undefined,
      parentName: getValue('parentName').trim() || undefined,
      parentEmail: getValue('parentEmail').trim() || undefined,
      emergencyContactName: getValue('emergencyContactName').trim() || undefined,
      emergencyContactPhone: getValue('emergencyContactPhone').trim() || undefined,
      isValid: errors.length === 0,
      errors,
    };
  };

  const reprocessWithMapping = useCallback(() => {
    if (!file) return;
    
    file.text().then(text => {
      const { headers: parsedHeaders, rows } = parseCSV(text);
      const students = rows.map(row => parseRowWithMapping(row, parsedHeaders, columnMapping));
      setParsedData(students);
    });
  }, [file, columnMapping]);

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...columnMapping, [field]: value };
    setColumnMapping(newMapping);
  };

  const proceedToPreview = () => {
    reprocessWithMapping();
    setStep('preview');
  };

  const handleImport = async () => {
    const validStudents = parsedData.filter(s => s.isValid);
    if (validStudents.length === 0) {
      toast({
        title: "No valid students",
        description: "Please fix the errors before importing",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setStep('importing');
    
    let successCount = 0;
    let failCount = 0;

    for (const student of validStudents) {
      try {
        if (!user) throw new Error('Not authenticated');

        await api.post('/students', {
          email: student.childLoginEmail,
          first_name: student.firstName,
          last_name: student.lastName,
          date_of_birth: student.dateOfBirth,
          school_id: schoolId,
          grade_level: student.classroom || null,
          parent_id: user.id,
        });

        successCount++;
      } catch (error: any) {
        console.error('Error inserting student:', error);
        failCount++;
      }
    }

    setImportResult({ success: successCount, failed: failCount });
    setImporting(false);

    if (successCount > 0) {
      toast({
        title: "Import complete",
        description: `Successfully imported ${successCount} students${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      onSuccess?.();
    } else {
      toast({
        title: "Import failed",
        description: "No students were imported. Please check your data and try again.",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setParsedData([]);
    setColumnMapping(DEFAULT_MAPPING);
    setStep('upload');
    setImportResult(null);
  };

  const validCount = parsedData.filter(s => s.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="space-y-6">
      {/* Download Template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            CSV Template
          </CardTitle>
          <CardDescription>
            Download our template to ensure your data imports correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Section */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Student Roster
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing your student information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="roster-upload"
              />
              <Label 
                htmlFor="roster-upload" 
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">CSV files only</p>
                </div>
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Section */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Map Your Columns</CardTitle>
            <CardDescription>
              We detected {headers.length} columns. Match them to the required fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { key: 'firstName', label: 'First Name', required: true },
                { key: 'lastName', label: 'Last Name', required: true },
                { key: 'dateOfBirth', label: 'Date of Birth', required: true },
                { key: 'childLoginEmail', label: 'Student login email', required: true },
                { key: 'classroom', label: 'Classroom', required: false },
                { key: 'parentName', label: 'Parent Name', required: false },
                { key: 'parentEmail', label: 'Parent Email', required: false },
              ].map(({ key, label, required }) => (
                <div key={key} className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={columnMapping[key as keyof ColumnMapping] || '_none_'}
                    onValueChange={(value) => handleMappingChange(key as keyof ColumnMapping, value === '_none_' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-- Not mapped --</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={proceedToPreview}>
                Preview Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Preview Import
                </CardTitle>
                <CardDescription>
                  Review the data before importing
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {invalidCount} errors
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {invalidCount} row(s) have errors and will be skipped during import.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Classroom</TableHead>
                    <TableHead>Student email</TableHead>
                    <TableHead>Parent Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllRows ? parsedData : parsedData.slice(0, 10)).map((student, index) => (
                    <TableRow 
                      key={index}
                      className={!student.isValid ? "bg-red-50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell>
                        {student.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          {student.firstName} {student.lastName}
                          {!student.isValid && (
                            <p className="text-xs text-red-500 mt-1">
                              {student.errors.join(', ')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{student.dateOfBirth || '-'}</TableCell>
                      <TableCell>{student.classroom || '-'}</TableCell>
                      <TableCell>{student.childLoginEmail || '-'}</TableCell>
                      <TableCell>{student.parentEmail || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedData.length > 10 && (
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setShowAllRows(!showAllRows)}
              >
                {showAllRows ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show All {parsedData.length} Rows
                  </>
                )}
              </Button>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {validCount} Students
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing Section */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              {importing ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium">Importing students...</p>
                  <p className="text-muted-foreground">This may take a moment</p>
                </>
              ) : importResult && (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Import Complete!</p>
                  <p className="text-muted-foreground">
                    {importResult.success} students imported successfully
                    {importResult.failed > 0 && `, ${importResult.failed} failed`}
                  </p>
                  <Button onClick={reset} className="mt-6">
                    Import More Students
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentRosterUpload;
