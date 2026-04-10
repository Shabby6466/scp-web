import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

interface VerificationResult {
  field: string;
  expected: string;
  extracted: string;
  match: boolean;
  severity: 'error' | 'warning' | 'info';
}

interface DocumentVerificationAlertProps {
  results: VerificationResult[];
  overallMatch: boolean;
}

export const DocumentVerificationAlert = ({ 
  results, 
  overallMatch 
}: DocumentVerificationAlertProps) => {
  const errors = results.filter(r => r.severity === 'error' && !r.match);
  const warnings = results.filter(r => r.severity === 'warning' && !r.match);
  const matches = results.filter(r => r.match);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          Document Verification Results
        </h3>
        {overallMatch ? (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            All Verified
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Issues Found
          </Badge>
        )}
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Critical Mismatches Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {errors.map((result, idx) => (
                <li key={idx}>
                  <span className="font-medium">{result.field}:</span>
                  <div className="ml-6 text-sm">
                    <div>Expected: <span className="font-mono">{result.expected}</span></div>
                    <div>Extracted: <span className="font-mono">{result.extracted}</span></div>
                  </div>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Potential Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {warnings.map((result, idx) => (
                <li key={idx}>
                  <span className="font-medium">{result.field}:</span>
                  <div className="ml-6 text-sm">
                    <div>Expected: <span className="font-mono">{result.expected}</span></div>
                    <div>Extracted: <span className="font-mono">{result.extracted}</span></div>
                  </div>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {matches.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Verified Fields:</h4>
          <div className="grid grid-cols-1 gap-2">
            {matches.map((result, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950 p-2 rounded"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">{result.field}:</span>
                <span className="font-mono">{result.expected}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!overallMatch && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please review the mismatches above before submitting. If the extracted information is correct, 
            you may need to update the student record first.
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
};
