import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle,
  Users,
  GraduationCap,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { ColumnMapping, RosterRow, ImportResult } from './RosterImportWizard';

interface ImportPreviewStepProps {
  rows: RosterRow[];
  mapping: ColumnMapping;
  importType: 'students' | 'parents' | 'both';
  duplicateHandling: 'skip' | 'update';
  onDuplicateHandlingChange: (handling: 'skip' | 'update') => void;
  schoolId: string;
  branchId?: string;
  fileName: string;
  onImportStart: () => void;
  onImportComplete: (result: ImportResult) => void;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ParsedRow {
  rowIndex: number;
  student: {
    firstName: string;
    lastName: string;
    dob?: string;
    gradeLevel?: string;
    classroom?: string;
    branchName?: string;
    studentId?: string;
  } | null;
  parents: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }[];
  errors: ValidationError[];
}

export default function ImportPreviewStep({
  rows,
  mapping,
  importType,
  duplicateHandling,
  onDuplicateHandlingChange,
  schoolId,
  branchId,
  fileName,
  onImportStart,
  onImportComplete,
}: ImportPreviewStepProps) {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const { parsedRows, summary } = useMemo(() => {
    const parsed: ParsedRow[] = [];
    let validRows = 0;
    let invalidRows = 0;
    const uniqueStudents = new Set<string>();
    const uniqueParentEmails = new Set<string>();

    rows.forEach((row, index) => {
      const errors: ValidationError[] = [];
      let student: ParsedRow['student'] = null;
      const parents: ParsedRow['parents'] = [];

      if (importType !== 'parents') {
        const firstName = row[mapping.studentFirstName]?.trim() || '';
        const lastName = row[mapping.studentLastName]?.trim() || '';

        if (!firstName) {
          errors.push({ row: index + 2, field: 'Student First Name', message: 'Required' });
        }
        if (!lastName) {
          errors.push({ row: index + 2, field: 'Student Last Name', message: 'Required' });
        }

        if (firstName && lastName) {
          const studentKey = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
          uniqueStudents.add(studentKey);

          student = {
            firstName,
            lastName,
            dob: row[mapping.studentDob]?.trim(),
            gradeLevel: row[mapping.gradeLevel]?.trim(),
            classroom: row[mapping.classroom]?.trim(),
            branchName: row[mapping.branchName]?.trim(),
            studentId: row[mapping.studentId]?.trim(),
          };
        }
      }

      if (importType !== 'students') {
        const parent1Email = row[mapping.parent1Email]?.trim().toLowerCase() || '';
        if (parent1Email) {
          if (!isValidEmail(parent1Email)) {
            errors.push({ row: index + 2, field: 'Parent 1 Email', message: 'Invalid email format' });
          } else {
            uniqueParentEmails.add(parent1Email);
            parents.push({
              email: parent1Email,
              firstName: row[mapping.parent1FirstName]?.trim(),
              lastName: row[mapping.parent1LastName]?.trim(),
              phone: row[mapping.parent1Phone]?.trim(),
            });
          }
        } else if (importType === 'both') {
          errors.push({ row: index + 2, field: 'Parent 1 Email', message: 'Recommended' });
        }

        const parent2Email = row[mapping.parent2Email]?.trim().toLowerCase() || '';
        if (parent2Email) {
          if (!isValidEmail(parent2Email)) {
            errors.push({ row: index + 2, field: 'Parent 2 Email', message: 'Invalid email format' });
          } else {
            uniqueParentEmails.add(parent2Email);
            parents.push({
              email: parent2Email,
              firstName: row[mapping.parent2FirstName]?.trim(),
              lastName: row[mapping.parent2LastName]?.trim(),
              phone: row[mapping.parent2Phone]?.trim(),
            });
          }
        }
      }

      const hasErrors = errors.some((e) => e.message === 'Required' || e.message === 'Invalid email format');
      if (hasErrors) {
        invalidRows++;
      } else {
        validRows++;
      }

      parsed.push({
        rowIndex: index + 2,
        student,
        parents,
        errors,
      });
    });

    return {
      parsedRows: parsed,
      summary: {
        totalRows: rows.length,
        validRows,
        invalidRows,
        uniqueStudents: uniqueStudents.size,
        uniqueParents: uniqueParentEmails.size,
      },
    };
  }, [rows, mapping, importType]);

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const errorRows = parsedRows.filter((r) =>
    r.errors.some((e) => e.message === 'Required' || e.message === 'Invalid email format')
  );

  const handleImport = async () => {
    setIsImporting(true);
    onImportStart();

    try {
      const importData = parsedRows
        .filter((r) => !r.errors.some((e) => e.message === 'Required' || e.message === 'Invalid email format'))
        .map((r) => ({
          student: r.student,
          parents: r.parents,
        }));

      const data = await api.post('/roster/import', {
        schoolId,
        branchId,
        fileName,
        importType,
        duplicateHandling,
        rows: importData,
      });

      onImportComplete({
        success: true,
        createdStudents: data.createdStudents || 0,
        updatedStudents: data.updatedStudents || 0,
        createdParents: data.createdParents || 0,
        matchedParents: data.matchedParents || 0,
        linkedRelationships: data.linkedRelationships || 0,
        errorCount: data.errorCount || 0,
        errors: data.errors || [],
        importJobId: data.importJobId,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary.validRows}</p>
                <p className="text-sm text-muted-foreground">Valid rows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.uniqueStudents}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.uniqueParents}</p>
                <p className="text-sm text-muted-foreground">Parents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{summary.invalidRows}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate handling options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Duplicate Handling</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={duplicateHandling}
            onValueChange={(value) => onDuplicateHandlingChange(value as 'skip' | 'update')}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="skip" id="skip" />
              <Label htmlFor="skip" className="font-normal cursor-pointer">
                Skip duplicates (create only new records)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="update" id="update" />
              <Label htmlFor="update" className="font-normal cursor-pointer">
                Update existing matches (merge new data)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Error rows preview */}
      {errorRows.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Rows with Errors ({errorRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorRows.slice(0, 20).flatMap((r) =>
                    r.errors
                      .filter((e) => e.message === 'Required' || e.message === 'Invalid email format')
                      .map((e, i) => (
                        <TableRow key={`${r.rowIndex}-${i}`}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell>{e.field}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{e.message}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              {errorRows.length > 20 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  + {errorRows.length - 20} more errors
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleImport}
          disabled={isImporting || summary.validRows === 0}
          className="min-w-[200px]"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>Import {summary.validRows} Records</>
          )}
        </Button>
      </div>
    </div>
  );
}
