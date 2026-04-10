import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import type { PendingDocument } from './types';

interface PendingDocumentsWidgetProps {
  documents: PendingDocument[];
  loading?: boolean;
  onView?: (doc: PendingDocument) => void;
  onApprove?: (doc: PendingDocument) => void;
  onReject?: (doc: PendingDocument) => void;
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-warning/10 text-warning border-warning/20' },
  missing: { label: 'Missing', variant: 'destructive' as const, className: '' },
  rejected: { label: 'Rejected', variant: 'destructive' as const, className: '' },
};

export function PendingDocumentsWidget({
  documents,
  loading = false,
  onView,
  onApprove,
  onReject,
}: PendingDocumentsWidgetProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Pending Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Pending Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No documents pending review</p>
            <p className="text-xs mt-1">All documents have been processed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Pending Documents
          </CardTitle>
          <Badge variant="outline">{documents.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.slice(0, 5).map((doc) => {
          const status = statusConfig[doc.status];
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.entityName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.documentType.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={status.variant} className={status.className}>
                  {status.label}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      if (onView) {
                        onView(doc);
                      } else if (doc.studentId) {
                        navigate(`/admin/student/${doc.studentId}`);
                      }
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {doc.status === 'pending' && onApprove && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                      onClick={() => onApprove(doc)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {doc.status === 'pending' && onReject && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onReject(doc)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        <Button
          variant="ghost"
          className="w-full justify-center gap-2 mt-2"
          onClick={() => navigate('/school/pending-documents')}
        >
          See all pending documents
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
