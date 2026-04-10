import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Upload, Check, X } from 'lucide-react';
import RosterUploadStep from './RosterUploadStep';
import ColumnMapperStep from './ColumnMapperStep';
import ImportPreviewStep from './ImportPreviewStep';
import ImportSummaryStep from './ImportSummaryStep';

export interface RosterRow {
  [key: string]: string;
}

export interface ColumnMapping {
  studentFirstName: string;
  studentLastName: string;
  studentDob: string;
  gradeLevel: string;
  classroom: string;
  branchName: string;
  studentId: string;
  parent1Email: string;
  parent1FirstName: string;
  parent1LastName: string;
  parent1Phone: string;
  parent2Email: string;
  parent2FirstName: string;
  parent2LastName: string;
  parent2Phone: string;
  familyId: string;
}

export interface ImportResult {
  success: boolean;
  createdStudents: number;
  updatedStudents: number;
  createdParents: number;
  matchedParents: number;
  linkedRelationships: number;
  errorCount: number;
  errors: { row: number; field: string; message: string }[];
  importJobId: string;
}

interface RosterImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  branchId?: string;
  onComplete?: () => void;
}

const STEPS = [
  { id: 'upload', title: 'Upload File' },
  { id: 'mapping', title: 'Map Columns' },
  { id: 'preview', title: 'Validate & Preview' },
  { id: 'summary', title: 'Import Summary' },
];

export default function RosterImportWizard({
  open,
  onOpenChange,
  schoolId,
  branchId,
  onComplete,
}: RosterImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importType, setImportType] = useState<'students' | 'parents' | 'both'>('both');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    studentFirstName: '',
    studentLastName: '',
    studentDob: '',
    gradeLevel: '',
    classroom: '',
    branchName: '',
    studentId: '',
    parent1Email: '',
    parent1FirstName: '',
    parent1LastName: '',
    parent1Phone: '',
    parent2Email: '',
    parent2FirstName: '',
    parent2LastName: '',
    parent2Phone: '',
    familyId: '',
  });
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('skip');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileProcessed = (
    newHeaders: string[],
    newRows: RosterRow[],
    newFileName: string
  ) => {
    setHeaders(newHeaders);
    setRows(newRows);
    setFileName(newFileName);
  };

  const handleMappingComplete = (mapping: ColumnMapping) => {
    setColumnMapping(mapping);
  };

  const handleImportComplete = (result: ImportResult) => {
    setImportResult(result);
    setCurrentStep(3);
    setIsImporting(false);
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep(0);
    setHeaders([]);
    setRows([]);
    setFileName('');
    setImportType('both');
    setColumnMapping({
      studentFirstName: '',
      studentLastName: '',
      studentDob: '',
      gradeLevel: '',
      classroom: '',
      branchName: '',
      studentId: '',
      parent1Email: '',
      parent1FirstName: '',
      parent1LastName: '',
      parent1Phone: '',
      parent2Email: '',
      parent2FirstName: '',
      parent2LastName: '',
      parent2Phone: '',
      familyId: '',
    });
    setDuplicateHandling('skip');
    setImportResult(null);
    setIsImporting(false);
    onOpenChange(false);
    if (onComplete && importResult?.success) {
      onComplete();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return rows.length > 0;
      case 1:
        if (importType === 'students' || importType === 'both') {
          return columnMapping.studentFirstName && columnMapping.studentLastName;
        }
        if (importType === 'parents') {
          return columnMapping.parent1Email;
        }
        return false;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Roster
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {STEPS.map((step, index) => (
              <span
                key={step.id}
                className={`${
                  index <= currentStep
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 0 && (
            <RosterUploadStep
              onFileProcessed={handleFileProcessed}
              importType={importType}
              onImportTypeChange={setImportType}
              fileName={fileName}
              rowCount={rows.length}
            />
          )}
          {currentStep === 1 && (
            <ColumnMapperStep
              headers={headers}
              sampleRows={rows.slice(0, 5)}
              importType={importType}
              mapping={columnMapping}
              onMappingChange={handleMappingComplete}
            />
          )}
          {currentStep === 2 && (
            <ImportPreviewStep
              rows={rows}
              mapping={columnMapping}
              importType={importType}
              duplicateHandling={duplicateHandling}
              onDuplicateHandlingChange={setDuplicateHandling}
              schoolId={schoolId}
              branchId={branchId}
              fileName={fileName}
              onImportStart={() => setIsImporting(true)}
              onImportComplete={handleImportComplete}
            />
          )}
          {currentStep === 3 && importResult && (
            <ImportSummaryStep
              result={importResult}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Navigation buttons */}
        {currentStep < 3 && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0 || isImporting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              {currentStep < 2 && (
                <Button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
