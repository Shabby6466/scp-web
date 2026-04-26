import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import DocumentReviewDialog from './DocumentReviewDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileText, Eye, Search, Filter, Shield } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { unwrapList } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { User, GraduationCap, Briefcase } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Categories',
  immunization_records: 'Immunization Records',
  health_forms: 'Health Forms',
  emergency_contacts: 'Emergency Contacts',
  birth_certificate: 'Birth Certificate',
  proof_of_residence: 'Proof of Residence',
  medical_records: 'Medical Records',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  expired: 'destructive',
};

type DocumentWithStudent = {
  id: string;
  file_name: string;
  category: string;
  status: string;
  notes: string | null;
  created_at: string;
  student_id: string | null;
  students: {
    first_name: string;
    last_name: string;
    grade_level: string | null;
    date_of_birth?: string;
  } | null;
  teachers?: {
    first_name: string;
    last_name: string;
  } | null;
  /** Dialog / details (camelCase from API) */
  fileName?: string;
  createdAt?: string;
  expiration_date?: string | null;
  file_size?: number;
  [key: string]: any;
};

function slugifyCategoryLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'document';
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

/** ISO string for sorting/API; empty string if missing or invalid (never throws). */
function safeToIsoString(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const d = new Date(typeof raw === 'number' ? raw : String(raw));
  return isValidDate(d) ? d.toISOString() : '';
}

/** `YYYY-MM-DD` or null; never throws. */
function safeToDateOnly(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const d = new Date(typeof raw === 'number' ? raw : String(raw));
  if (!isValidDate(d)) return null;
  return d.toISOString().slice(0, 10);
}

function isPastExpiry(expiresAt: unknown): boolean {
  if (expiresAt == null || expiresAt === '') return false;
  const d = new Date(typeof expiresAt === 'number' ? expiresAt : String(expiresAt));
  if (!isValidDate(d)) return false;
  return d < new Date();
}

/** Map `GET /documents/search` rows (Nest camelCase + relations) to list + dialog shape. */
function normalizeAdminDocument(raw: unknown): DocumentWithStudent {
  const d = raw as Record<string, unknown>;
  const dt = d.documentType as Record<string, unknown> | undefined;
  const cat = dt?.category as Record<string, unknown> | undefined;
  const categorySlug =
    (typeof cat?.slug === 'string' && cat.slug.trim()
      ? cat.slug.trim()
      : null) ??
    (typeof cat?.name === 'string' && cat.name.trim()
      ? slugifyCategoryLabel(cat.name)
      : null) ??
    (typeof dt?.name === 'string' && dt.name.trim()
      ? slugifyCategoryLabel(String(dt.name))
      : 'document');

  const verifiedAt = d.verifiedAt ?? d.verified_at;
  const expiresAt = d.expiresAt ?? d.expires_at;
  let status = 'pending';
  if (verifiedAt) {
    status = 'approved';
  } else if (isPastExpiry(expiresAt)) {
    status = 'expired';
  }

  const sp = d.studentProfile as Record<string, unknown> | undefined;
  const hasStudent = sp != null && sp.id != null;
  const students = hasStudent
    ? {
        first_name: String(sp.firstName ?? sp.first_name ?? ''),
        last_name: String(sp.lastName ?? sp.last_name ?? ''),
        grade_level:
          (sp.gradeLevel ?? sp.grade_level ?? null) as string | null,
        date_of_birth:
          safeToDateOnly(sp.dateOfBirth) ??
          safeToDateOnly(sp.date_of_birth) ??
          undefined,
      }
    : null;

  const ou = d.ownerUser as Record<string, unknown> | undefined;
  const role = String(ou?.role ?? '');
  const teachers =
    !hasStudent && (role === 'TEACHER' || role === 'BRANCH_DIRECTOR') && ou
      ? (() => {
          const name = String(ou.name ?? '');
          const parts = name.trim().split(/\s+/).filter(Boolean);
          return {
            first_name: parts[0] ?? '',
            last_name: parts.slice(1).join(' ') || '',
          };
        })()
      : null;

  const fileName = String(d.fileName ?? d.file_name ?? '');
  const createdRaw = d.createdAt ?? d.created_at;
  const created_at = safeToIsoString(createdRaw);

  const sizeBytes = d.sizeBytes ?? d.file_size;
  const file_size =
    typeof sizeBytes === 'number'
      ? sizeBytes
      : typeof sizeBytes === 'string'
        ? Number(sizeBytes)
        : 0;

  const expRaw = d.expiresAt ?? d.expiration_date;
  const expiration_date = safeToDateOnly(expRaw);

  return {
    id: String(d.id),
    file_name: fileName,
    fileName,
    category: categorySlug,
    status,
    notes: (d.notes as string | null) ?? null,
    created_at,
    createdAt: created_at,
    student_id: hasStudent ? String(sp.id) : null,
    students,
    teachers,
    expiration_date,
    file_size,
    documentType: dt,
    ownerUser: ou,
    studentProfile: sp,
  };
}

const AdminDocuments = () => {
  const {
    isAdmin,
    schoolId: viewerSchoolId,
    branchId: viewerBranchId,
    isBranchDirector,
  } = useUserRole();
  const [documents, setDocuments] = useState<DocumentWithStudent[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithStudent | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    try {
      const raw = await documentService.search({
        limit: 200,
        ...(!isAdmin && viewerSchoolId
          ? {
              schoolId: viewerSchoolId,
              ...(viewerBranchId && isBranchDirector
                ? { branchId: viewerBranchId }
                : {}),
            }
          : {}),
      });
      const rows = unwrapList<unknown>(raw);
      setDocuments(rows.map(normalizeAdminDocument));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load documents',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, [isAdmin, viewerSchoolId, viewerBranchId, isBranchDirector]);

  useEffect(() => {
    applyFilters();
  }, [documents, categoryFilter, statusFilter, searchQuery]);

  const applyFilters = () => {
    let filtered = [...documents];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) =>
        (doc.file_name ?? (doc as { fileName?: string }).fileName ?? '')
          .toLowerCase()
          .includes(query) ||
        (doc.students?.first_name ?? '').toLowerCase().includes(query) ||
        (doc.students?.last_name ?? '').toLowerCase().includes(query),
      );
    }

    setFilteredDocuments(filtered);
  };

  const openReviewDialog = (doc: DocumentWithStudent) => {
    setSelectedDocument(doc);
    setReviewDialogOpen(true);
  };

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    approved: documents.filter(d => d.status === 'approved').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="backdrop-blur-sm bg-white/50 border-border/40">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="backdrop-blur-sm bg-white/50 border-border/40">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 selection:bg-primary/20">
      <DocumentReviewDialog
        document={selectedDocument}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onReviewComplete={fetchDocuments}
      />

      <div>
        <h2 className="text-2xl font-bold mb-2">Document Review</h2>
        <p className="text-muted-foreground">
          Review and manage all submitted documents
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40">
          <CardHeader className="pb-3 text-center">
            <CardDescription className="font-medium">Total Documents</CardDescription>
            <CardTitle className="text-4xl font-display font-bold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40">
          <CardHeader className="pb-3 text-center">
            <CardDescription className="font-medium">Pending Review</CardDescription>
            <CardTitle className="text-4xl font-display font-bold text-amber-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40">
          <CardHeader className="pb-3 text-center">
            <CardDescription className="font-medium">Approved</CardDescription>
            <CardTitle className="text-4xl font-display font-bold text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 text-center">
          <CardHeader className="pb-3">
            <CardDescription className="font-medium">Rejected</CardDescription>
            <CardTitle className="text-4xl font-display font-bold text-destructive">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by file name or student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="backdrop-blur-sm bg-white/40 dark:bg-black/20 border-border/40 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display font-semibold">
                          {doc.file_name || (doc as { fileName?: string }).fileName || 'Untitled'}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={STATUS_COLORS[doc.status] || 'secondary'} className="capitalize font-medium">
                            {doc.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5">
                            {CATEGORY_LABELS[doc.category] || doc.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {/* CardDescription renders as <p>; block layout must use a div to avoid validateDOMNesting warnings */}
                    <div className="text-xs text-muted-foreground">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-3">
                        {doc.students ? (
                          <div className="flex items-center gap-2 text-foreground/80">
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">Student: <strong>{doc.students.first_name} {doc.students.last_name}</strong></span>
                            {doc.students.grade_level && <span className="text-xs text-muted-foreground">({doc.students.grade_level})</span>}
                          </div>
                        ) : doc.teachers ? (
                          <div className="flex items-center gap-2 text-foreground/80">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">Teacher: <strong>{doc.teachers.first_name} {doc.teachers.last_name}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-foreground/80">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm italic">No subject linked</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          Uploaded:{' '}
                          {doc.created_at &&
                          isValidDate(new Date(doc.created_at))
                            ? new Date(doc.created_at).toLocaleDateString(undefined, {
                                dateStyle: 'medium',
                              })
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {doc.notes && (
                  <div className="bg-muted/30 p-2.5 rounded text-sm text-foreground/70 mb-4 border-l-2 border-primary/20 italic">
                    "{doc.notes}"
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-[10px] text-muted-foreground">
                    ID: {doc.id.split('-')[0]}...
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openReviewDialog(doc)}
                    className="shadow-sm hover:translate-x-1 transition-transform"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review & Authenticate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDocuments;
