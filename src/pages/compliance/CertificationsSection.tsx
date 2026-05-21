import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceData } from '@/hooks/useComplianceData';
import { COMPLIANCE_CATEGORY_SLUG } from '@/constants/complianceCategories';
import { documentCategoryService } from '@/services/documentCategoryService';
import { documentTypeService } from '@/services/documentTypeService';
import { documentService } from '@/services/documentService';
import { requirementService } from '@/services/requirementService';
import { unwrapList } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

type CertificationDocument = {
  id: string;
  fileName: string;
  expiresAt: string | null;
  createdAt: string | null;
  reviewStatus: string;
  userId: string | null;
  documentType?: { id: string; name: string } | null;
};

const CertificationsSection = () => {
  const { schoolId } = useUserRole();
  const { stats: certDocStats, loading: certDocLoading } = useComplianceData(
    schoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.CERTIFICATIONS,
  );

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CertificationDocument[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [typeCount, setTypeCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, expired: 0 });

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const categories = unwrapList(await documentCategoryService.list({ schoolId }));
      const certCategory = categories.find((c) => c.slug === 'certifications');
      if (!certCategory) {
        setRecords([]);
        setTypeCount(0);
        setPendingCount(0);
        setStats({ total: 0, active: 0, expiring: 0, expired: 0 });
        return;
      }

      const [docTypesRes, docsRes, reqsRes] = await Promise.all([
        documentTypeService.list({ schoolId, categoryId: certCategory.id }),
        documentService.search({ schoolId, limit: 200 }),
        requirementService.list({ schoolId }),
      ]);

      const certTypes = unwrapList(docTypesRes);
      setTypeCount(certTypes.length);
      const typeIds = new Set(certTypes.map((dt) => dt.id));

      const certDocs = unwrapList<any>(docsRes)
        .filter((doc) => typeIds.has(doc.documentTypeId ?? doc.document_type_id))
        .map((doc) => ({
          id: doc.id,
          fileName: doc.fileName ?? doc.file_name ?? 'Certification file',
          expiresAt: doc.expiresAt ?? doc.expiration_date ?? null,
          createdAt: doc.createdAt ?? doc.created_at ?? null,
          reviewStatus: (doc.reviewStatus ?? doc.status ?? 'PENDING').toString(),
          userId: doc.userId ?? doc.owner_user_id ?? null,
          documentType: doc.documentType ?? null,
        }));
      setRecords(certDocs);

      const pendingReqs = unwrapList(reqsRes).filter(
        (r) =>
          typeIds.has(r.documentTypeId) &&
          (r.status === 'PENDING' || r.status === 'REJECTED' || r.status === 'SUBMITTED'),
      );
      setPendingCount(pendingReqs.length);

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

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesSearch =
          !searchQuery ||
          record.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.documentType?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        const now = new Date();
        const status = !record.expiresAt
          ? 'active'
          : new Date(record.expiresAt) < now
            ? 'expired'
            : differenceInDays(new Date(record.expiresAt), now) <= 30
              ? 'expiring'
              : 'active';
        const matchesStatus = statusFilter === 'all' || statusFilter === status;
        return matchesSearch && matchesStatus;
      }),
    [records, searchQuery, statusFilter],
  );

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <Badge variant="secondary">Certifications & Licenses</Badge>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">Certifications & Licenses</h1>
            <p className="text-muted-foreground max-w-2xl">
              Monitor staff certifications, vendor credentials, and facility permits. Configure
              document types on the Requirements page; uploads happen from each user&apos;s document
              checklist.
            </p>
            {!certDocLoading && certDocStats && (
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                Compliance rate (certifications category):{' '}
                <span className="font-medium text-foreground">
                  {Math.round(certDocStats.student_compliance_rate)}% students
                </span>
                {' · '}
                <span className="font-medium text-foreground">
                  {Math.round(certDocStats.teacher_compliance_rate)}% staff
                </span>
                {pendingCount > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-amber-700">{pendingCount} pending</span>
                  </>
                )}
              </p>
            )}
          </div>
          <Button variant="outline" asChild>
            <Link to="/school/requirements?tab=staff">
              <Settings className="h-4 w-4 mr-2" />
              Manage requirement types
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Document types</p>
                <div className="text-3xl font-bold">
                  {loading ? <Skeleton className="h-8 w-16" /> : typeCount}
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
                <p className="text-sm text-muted-foreground">Uploaded</p>
                <div className="text-3xl font-bold">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
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
                  className={`text-3xl font-bold ${stats.expiring > 0 ? 'text-yellow-600' : ''}`}
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
                <div className={`text-3xl font-bold ${stats.expired > 0 ? 'text-red-600' : ''}`}>
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
          </div>
        </CardContent>
      </Card>

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
                  ? 'Configure certification document types on the Requirements page, then users can upload from their checklist.'
                  : 'No certifications match your current filters.'}
              </p>
              {records.length === 0 && (
                <Button asChild>
                  <Link to="/school/requirements?tab=staff">Configure requirements</Link>
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
                    <TableCell className="font-medium">{record.fileName}</TableCell>
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
