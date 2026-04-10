import { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RosterRow } from './RosterImportWizard';

interface RosterUploadStepProps {
  onFileProcessed: (headers: string[], rows: RosterRow[], fileName: string) => void;
  importType: 'students' | 'parents' | 'both';
  onImportTypeChange: (type: 'students' | 'parents' | 'both') => void;
  fileName: string;
  rowCount: number;
}

export default function RosterUploadStep({
  onFileProcessed,
  importType,
  onImportTypeChange,
  fileName,
  rowCount,
}: RosterUploadStepProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = (text: string): { headers: string[]; rows: RosterRow[] } => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const rows: RosterRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: RosterRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());

    return result;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv') {
        const text = await file.text();
        const { headers, rows } = parseCSV(text);
        
        if (headers.length === 0 || rows.length === 0) {
          throw new Error('File appears to be empty or invalid');
        }
        
        onFileProcessed(headers, rows, file.name);
        toast({
          title: 'File uploaded',
          description: `Found ${rows.length} rows with ${headers.length} columns`,
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        toast({
          title: 'Excel files',
          description: 'Please save your Excel file as CSV and upload again',
          variant: 'destructive',
        });
      } else {
        throw new Error('Unsupported file type. Please upload a CSV file.');
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: 'Error processing file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [onFileProcessed, toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import type selection */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">
            This roster includes:
          </Label>
          <RadioGroup
            value={importType}
            onValueChange={(value) =>
              onImportTypeChange(value as 'students' | 'parents' | 'both')
            }
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="font-normal cursor-pointer">
                Both Students and Parents/Guardians (recommended)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="students" id="students" />
              <Label htmlFor="students" className="font-normal cursor-pointer">
                Students only
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="parents" id="parents" />
              <Label htmlFor="parents" className="font-normal cursor-pointer">
                Parents/Guardians only
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* File upload area */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : fileName
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {fileName ? (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {rowCount} rows ready to import
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  Choose different file
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {isProcessing ? (
                  <div className="animate-pulse">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Processing file...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drop your roster file here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      Select File
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Supported: CSV files
                    </p>
                  </>
                )}
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Tips for best results:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Include column headers in the first row</li>
                <li>Use consistent email format for parents</li>
                <li>Date of birth should be in MM/DD/YYYY format</li>
                <li>You can map columns in the next step</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
