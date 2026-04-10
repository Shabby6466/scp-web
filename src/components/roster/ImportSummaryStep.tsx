import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  CheckCircle,
  Users,
  GraduationCap,
  Link2,
  AlertTriangle,
  Download,
  PartyPopper,
  ArrowRight,
} from 'lucide-react';
import type { ImportResult } from './RosterImportWizard';

interface ImportSummaryStepProps {
  result: ImportResult;
  onClose: () => void;
}

export default function ImportSummaryStep({ result, onClose }: ImportSummaryStepProps) {
  const navigate = useNavigate();
  const handleDownloadErrors = () => {
    if (result.errors.length === 0) return;

    const csvContent = [
      ['Row', 'Field', 'Error'].join(','),
      ...result.errors.map((e) => [e.row, e.field, `"${e.message}"`].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCreated =
    result.createdStudents + result.createdParents + result.linkedRelationships;

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {result.success && totalCreated > 0 && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <PartyPopper className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Import Successful!
                </h3>
                <p className="text-green-600 dark:text-green-400">
                  {totalCreated} records have been created
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.createdStudents}</p>
                <p className="text-sm text-muted-foreground">Students Created</p>
              </div>
            </div>
            {result.updatedStudents > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                + {result.updatedStudents} updated
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.createdParents}</p>
                <p className="text-sm text-muted-foreground">Parents Created</p>
              </div>
            </div>
            {result.matchedParents > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                + {result.matchedParents} matched existing
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{result.linkedRelationships}</p>
                <p className="text-sm text-muted-foreground">Relationships Linked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${result.errorCount > 0 ? 'bg-destructive/10' : 'bg-green-100 dark:bg-green-900/20'}`}>
                {result.errorCount > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{result.errorCount}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors table */}
      {result.errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Import Errors
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errors.slice(0, 50).map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.field}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{error.message}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.errors.length > 50 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Download CSV to see all {result.errors.length} errors
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Next steps */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="font-medium mb-2">What's Next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Review imported students and assign branches</li>
            <li>• Send parent invitations to get documents uploaded</li>
            <li>• Parents will receive email links to create accounts and upload</li>
          </ul>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {result.importJobId && (
          <Button onClick={() => {
            onClose();
            navigate(`/roster/import/${result.importJobId}/review`);
          }}>
            Review & Send Invites
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
