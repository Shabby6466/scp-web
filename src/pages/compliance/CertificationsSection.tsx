import { useEffect, useMemo, useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useComplianceData } from '@/hooks/useComplianceData';
import { COMPLIANCE_CATEGORY_SLUG } from '@/constants/complianceCategories';
import { documentTypeService } from '@/services/documentTypeService';
import { documentService } from '@/services/documentService';
import { storageService } from '@/services/storageService';
import { unwrapList } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

type CertificationType = {
  id: string;
  name: string;
  validityMonths?: number | null;
};

type CertificationDocument = {
  id: string;
  fileName: string;
  expiresAt: string | null;
  createdAt: string | null;
  reviewStatus: string;
  ownerUserId: string | null;
  documentType?: { id: string; name: string } | null;
};

const CertificationsSection = () => {
  const { user } = useAuth();
  const { schoolId } = useUserRole();
  const { stats: certDocStats, loading: certDocLoading } = useComplianceData(
    schoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.CERTIFICATIONS,
  );

  const [loading, setLoading] = useState(true);
  const [certificationTypes, setCertificationTypes] = useState<CertificationType[]>([]);
  const [records, setRecords] = useState<CertificationDocument[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all | active | expiring | expired
  const [createOpen, setCreateOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0 });

  const [formData, setFormData] = useState({
    documentTypeId: '',
    file: null as File | null,
    issuedDate: '',
    expiryDate: '',
    notes: '',
  });

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [docTypesRes, docsRes] = await Promise.all([
        documentTypeService.list({ schoolId, targetRole: 'TEACHER' }),
        documentService.search({ schoolId, limit: 200 }),
      ]);
      const certTypes = unwrapList<any>(docTypesRes).filter((dt) => dt.kind === 'CERTIFICATION');
      setCertificationTypes(
        certTypes.map((dt) => ({
          id: dt.id,
          name: dt.name,
          validityMonths: dt.validityMonths ?? null,
        })),
      );

      const typeIds = new Set(certTypes.map((dt) => dt.id));
      const certDocs = unwrapList<any>(docsRes)
        .filter((doc) => typeIds.has(doc.documentTypeId ?? doc.document_type_id))
        .map((doc) => ({
          id: doc.id,
          fileName: doc.fileName ?? doc.file_name ?? 'Certification file',
          expiresAt: doc.expiresAt ?? doc.expiration_date ?? null,
          createdAt: doc.createdAt ?? doc.created_at ?? null,
          reviewStatus: (doc.reviewStatus ?? doc.status ?? 'PENDING').toString(),
          ownerUserId: doc.ownerUserId ?? doc.owner_user_id ?? null,
          documentType: doc.documentType ?? null,
        }));
      setRecords(certDocs);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const nextStats = certDocs.reduce(
        (acc, record) => {
          acc.total += 1;
          if (!record.expiresAt) {
            acc.active += 1;
            return acc;
          }
          const expiryDate = new Date(record.expiresAt);
          if (expiryDate < now) acc.expired += 1;
          else if (expiryDate <= thirtyDaysFromNow) acc.expiring += 1;
          else acc.active += 1;
          return acc;
        },
        { total: 0, active: 0, expiring: 0, expired: 0 },
      );
      setStats(nextStats);
    } catch {
      toast.error('Failed to load certifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [schoolId]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const matchesSearch =
      !searchQuery ||
      record.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.documentType?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const now = new Date();
    const status =
      !record.expiresAt
        ? 'active'
        : new Date(record.expiresAt) < now
          ? 'expired'
          : differenceInDays(new Date(record.expiresAt), now) <= 30
            ? 'expiring'
            : 'active';
    const matchesStatus = statusFilter === 'all' || statusFilter === status;
    return matchesSearch && matchesStatus;
  }), [records, searchQuery, statusFilter]);

  const getStatusBadge = (record: CertificationDocument) => {
    const now = new Date();
    if (!record.expiresAt) {
      return <Badge variant="outline">No Expiry</Badge>;
    }
    const expiryDate = parseISO(record.expiresAt);
    const daysUntilExpiry = differenceInDays(expiryDate, now);

    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    if (daysUntilExpiry <= 30) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expiring ({daysUntilExpiry}d)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  const handleCreateSubmit = async () => {
    if (!schoolId || !user?.id) return;
    if (!formData.documentTypeId) {
      toast.error('Select a certification type');
      return;
    }
    if (!formData.file) {
      toast.error('Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      const presign = await documentService.presign({
        documentTypeId: formData.documentTypeId,
        ownerUserId: user.id,
        fileName: formData.file.name,
        mimeType: formData.file.type || 'application/octet-stream',
        sizeBytes: formData.file.size,
      });
      const presignedUrl = presign?.presignedUrl ?? presign?.uploadUrl;
      const s3Key = presign?.s3Key;
      if (!presignedUrl || !s3Key) {
        throw new Error('Upload URL missing');
      }

      await storageService.uploadFile(presignedUrl, formData.file);
      await documentService.complete({
        documentTypeId: formData.documentTypeId,
        ownerUserId: user.id,
        s3Key,
        fileName: formData.file.name,
        mimeType: formData.file.type || 'application/octet-stream',
        sizeBytes: formData.file.size,
        notes: formData.notes || undefined,
        issuedAt: formData.issuedDate || undefined,
        expiresAt: formData.expiryDate || undefined,
      } as any);

      toast.success('Certification uploaded');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload certification');
    } finally {
      setSubmitting(false);
    }

    setFormData({
      documentTypeId: '',
      file: null,
      issuedDate: '',
      expiryDate: '',
      notes: '',
    });
    setCreateOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="secondary">Certifications & Licenses</Badge>
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">
              Certifications & Licenses
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Track staff certifications, vendor credentials, and facility permits. Get notified
              before expiration dates and maintain evidence for audits.
            </p>
            {!certDocLoading && certDocStats && (
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                Related document requirements (certifications category):{' '}
                <span className="font-medium text-foreground">
                  {Math.round(certDocStats.student_compliance_rate)}% students
                </span>
                {' · '}
                <span className="font-medium text-foreground">
                  {Math.round(certDocStats.teacher_compliance_rate)}% staff
                </span>
              </p>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <div className="text-3xl font-bold">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
                    </div>
                  </div>
                  <Award className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <div className="text-3xl font-bold text-green-600">
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.active}
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={stats.expiring > 0 ? 'border-yellow-200 dark:border-yellow-900' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                    <div
                      className={`text-3xl font-bold ${
                        stats.expiring > 0 ? 'text-yellow-600' : ''
                      }`}
                    >
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.expiring}
                    </div>
                  </div>
                  <Clock
                    className={`h-8 w-8 ${
                      stats.expiring > 0 ? 'text-yellow-500' : 'text-muted-foreground'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className={stats.expired > 0 ? 'border-red-200 dark:border-red-900' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expired</p>
                    <div
                      className={`text-3xl font-bold ${stats.expired > 0 ? 'text-red-600' : ''}`}
                    >
                      {loading ? <Skeleton className="h-8 w-16" /> : stats.expired}
                    </div>
                  </div>
                  <AlertTriangle
                    className={`h-8 w-8 ${
                      stats.expired > 0 ? 'text-red-500' : 'text-muted-foreground'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search certifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Certification</DialogTitle>
                      <DialogDescription>
                        Track a new certification or license for your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Certification Type</Label>
                        <Select
                          value={formData.documentTypeId}
                          onValueChange={(v) =>
                            setFormData({ ...formData, documentTypeId: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                          <SelectContent>
                            {certificationTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {certificationTypes.length === 0 && !loading && (
                          <p className="text-xs text-muted-foreground">
                            No types are defined for your school yet. A director or admin can create
                            them with{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                              POST /api/document-types
                            </code>{' '}
                            (body includes:{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                              name
                            </code>
                            ,{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">kind=CERTIFICATION</code>
                            ,{' '}
                            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">schoolId</code>
                            ).
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certFile">Certification File *</Label>
                        <Input
                          id="certFile"
                          type="file"
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Issued Date</Label>
                          <Input
                            type="date"
                            value={formData.issuedDate}
                            onChange={(e) =>
                              setFormData({ ...formData, issuedDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input
                            type="date"
                            value={formData.expiryDate}
                            onChange={(e) =>
                              setFormData({ ...formData, expiryDate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Any additional notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSubmit} disabled={submitting}>
                        {submitting ? 'Uploading...' : 'Upload'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Certifications Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {records.length === 0
                      ? 'Add your first certification to start tracking.'
                      : 'No certifications match your current filters.'}
                  </p>
                  {records.length === 0 && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certification</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.fileName}
                        </TableCell>
                        <TableCell>{record.documentType?.name || '-'}</TableCell>
                        <TableCell>
                          {record.expiresAt
                            ? format(parseISO(record.expiresAt), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
    </div>
  );
};

export default CertificationsSection;
