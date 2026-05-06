import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Clock, Eye, FileText, User, CheckCircle, XCircle } from 'lucide-react';
import type { SchoolDocRow } from '@/pages/school/schoolDocumentsTypes';

const CATEGORY_LABELS: Record<string, string> = {
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

function reviewBadge(row: SchoolDocRow) {
  if (row.verifiedAt) {
    return (
      <Badge variant="outline" className="capitalize bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Verified
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="capitalize bg-amber-50 text-amber-700 border-amber-200">
      <Clock className="h-3 w-3 mr-1" />
      Pending review
    </Badge>
  );
}

function daysCell(row: SchoolDocRow) {
  if (row.daysUntilExpiry === null) return <span className="text-muted-foreground">—</span>;
  if (row.daysUntilExpiry < 0) {
    return (
      <span className="text-destructive font-medium tabular-nums">
        Expired ({Math.abs(row.daysUntilExpiry)}d ago)
      </span>
    );
  }
  return <span className="tabular-nums">{row.daysUntilExpiry}d</span>;
}

export interface SchoolDocumentsTableProps {
  rows: SchoolDocRow[];
  loading: boolean;
  onView: (row: SchoolDocRow) => void;
  onReview: (row: SchoolDocRow) => void;
}

export function SchoolDocumentsTable({ rows, loading, onView, onReview }: SchoolDocumentsTableProps) {
  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-12 text-center text-muted-foreground">Loading documents…</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-2">No documents match</h3>
        <p className="text-sm text-muted-foreground">Try adjusting filters or search.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-medium min-w-[180px]">Owner / subject</TableHead>
            <TableHead className="font-medium min-w-[200px]">Document</TableHead>
            <TableHead className="font-medium">Uploaded</TableHead>
            <TableHead className="font-medium">Review</TableHead>
            <TableHead className="font-medium">Expires</TableHead>
            <TableHead className="font-medium">Days</TableHead>
            <TableHead className="text-right font-medium w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{row.ownerLabel}</div>
                    {row.ownerSub ? (
                      <div className="text-xs text-muted-foreground truncate">{row.ownerSub}</div>
                    ) : null}
                    <Badge variant="secondary" className="mt-1 text-xs capitalize">
                      {row.ownerKind === 'student_profile'
                        ? 'Student'
                        : row.ownerKind === 'teacher'
                          ? 'Staff'
                          : 'Other'}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {CATEGORY_LABELS[row.categorySlug] || row.documentTypeName || row.categorySlug}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[220px]" title={row.fileName}>
                  {row.fileName}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {new Date(row.createdAt).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell>{reviewBadge(row)}</TableCell>
              <TableCell>
                {row.expiresAt ? (
                  <span className="text-sm whitespace-nowrap">
                    {new Date(row.expiresAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>{daysCell(row)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onView(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View</TooltipContent>
                  </Tooltip>
                  {!row.verifiedAt && (
                    <Button size="sm" onClick={() => onReview(row)}>
                      Review
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
