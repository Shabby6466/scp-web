import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { documentService } from '@/services/documentService';
import { schoolService } from '@/services/schoolService';
import { requirementService, type Requirement } from '@/services/requirementService';
import RequirementStatusBadge from '@/components/requirements/RequirementStatusBadge';
import { api } from '@/lib/api';
import { unwrapList } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import DocumentReviewDialog from '@/components/admin/DocumentReviewDialog';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { SchoolDocumentsTable } from '@/components/school/SchoolDocumentsTable';
import { normalizeDocumentRow, type SchoolDocRow } from '@/pages/school/schoolDocumentsTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react';

const TeacherCompliance = lazy(() => import('./TeacherCompliance'));

const PAGE_LIMIT = 200;

async function fetchAllDocumentPages(params: {
  schoolId: string;
  branchId?: string;
  query?: string;
  status?: string;
  ownerRole?: string;
  documentTypeId?: string;
}): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  for (;;) {
    const res = await documentService.search({
      ...params,
      limit: PAGE_LIMIT,
      offset,
    });
    const batch = unwrapList<Record<string, unknown>>(res);
    all.push(...batch);
    if (batch.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }
  return all;
}

export default function SchoolDocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = tabParam === 'staff' ? 'staff' : tabParam === 'assignments' ? 'assignments' : 'documents';

  const { user, loading: authLoading } = useAuth();
  const {
    canManageSchool,
    isParent,
    schoolId,
    branchId,
    isBranchDirector,
    isAdmin,
    loading: roleLoading,
  } = useUserRole();

  const [adminSchoolId, setAdminSchoolId] = useState<string>('');
  /** `null` = still loading school list for platform admin */
  const [adminSchools, setAdminSchools] = useState<{ id: string; name: string }[] | null>(null);

  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [ownerScope, setOwnerScope] = useState<'all' | 'teachers' | 'student_linked'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [documentTypeId, setDocumentTypeId] = useState<string>('all');
  const [expiringWithin30, setExpiringWithin30] = useState(false);

  const [selectedRow, setSelectedRow] = useState<SchoolDocRow | null>(null);
  const [viewRow, setViewRow] = useState<SchoolDocRow | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const [sending30, setSending30] = useState(false);
  const [sending7, setSending7] = useState(false);
  const [sendingExpired, setSendingExpired] = useState(false);
  const [assignmentRows, setAssignmentRows] = useState<Requirement[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const effectiveSchoolId = isAdmin && !schoolId ? adminSchoolId : schoolId ?? '';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!isAdmin || schoolId) return;
    let cancelled = false;
    void (async () => {
      try {
        const sch = await schoolService.list();
        const list = Array.isArray(sch) ? sch : (sch as { data?: unknown }).data;
        const rows = Array.isArray(list) ? list : [];
        if (cancelled) return;
        const mapped = rows.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }));
        setAdminSchools(mapped);
        setAdminSchoolId((prev) => prev || String((rows[0] as { id: string } | undefined)?.id ?? ''));
      } catch {
        if (!cancelled) setAdminSchools([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, schoolId]);

  const loadDocuments = useCallback(async () => {
    if (!effectiveSchoolId) {
      setRawRows([]);
      setLoadingDocs(false);
      return;
    }
    setLoadingDocs(true);
    try {
      const base: Parameters<typeof fetchAllDocumentPages>[0] = {
        schoolId: effectiveSchoolId,
        ...(branchId && isBranchDirector ? { branchId } : {}),
        ...(debouncedQuery ? { query: debouncedQuery } : {}),
        ...(reviewFilter === 'pending' ? { status: 'pending' } : {}),
        ...(reviewFilter === 'verified' ? { status: 'approved' } : {}),
        ...(ownerScope === 'teachers' ? { ownerRole: 'TEACHER' } : {}),
        ...(documentTypeId && documentTypeId !== 'all' ? { documentTypeId } : {}),
      };
      const data = await fetchAllDocumentPages(base);
      setRawRows(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load documents';
      toast({ variant: 'destructive', title: 'Error', description: message });
      setRawRows([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [
    effectiveSchoolId,
    branchId,
    isBranchDirector,
    debouncedQuery,
    reviewFilter,
    ownerScope,
    documentTypeId,
  ]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isParent) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!canManageSchool) {
      navigate('/not-authorized', { replace: true });
      return;
    }
    if (!isAdmin && !schoolId) {
      navigate('/school-register');
      return;
    }
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate, isAdmin, schoolId]);

  useEffect(() => {
    if (authLoading || roleLoading || !user || isParent || !canManageSchool) return;
    if (!isAdmin && !schoolId) return;
    if (isAdmin && !schoolId && !adminSchoolId) return;
    void loadDocuments();
  }, [
    loadDocuments,
    authLoading,
    roleLoading,
    user,
    isParent,
    canManageSchool,
    isAdmin,
    schoolId,
    adminSchoolId,
  ]);

  const normalized = useMemo(
    () => rawRows.map((r) => normalizeDocumentRow(r)),
    [rawRows],
  );

  const documentTypeOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of normalized) {
      if (r.documentTypeId) {
        m.set(r.documentTypeId, r.documentTypeName || r.documentTypeId);
      }
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [normalized]);

  const filteredRows = useMemo(() => {
    let list = normalized;
    if (ownerScope === 'student_linked') {
      list = list.filter((r) => r.ownerKind === 'student_profile');
    }
    if (expiringWithin30) {
      list = list.filter(
        (r) => r.daysUntilExpiry !== null && r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 30,
      );
    }
    return list;
  }, [normalized, ownerScope, expiringWithin30]);

  const pendingCount = useMemo(
    () => normalized.filter((r) => !r.verifiedAt).length,
    [normalized],
  );
  const expiringSoonCount = useMemo(
    () =>
      normalized.filter(
        (r) => r.daysUntilExpiry !== null && r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 30,
      ).length,
    [normalized],
  );

  const schoolIdForReminders = user?.schoolId ?? undefined;

  const postExpirationReminders = async (body: { threshold: number; includeExpired?: boolean }) => {
    if (!schoolIdForReminders) {
      toast({
        title: 'Cannot send',
        description: 'Your account is not linked to a school.',
        variant: 'destructive',
      });
      return;
    }
    const data = (await api.post('/reminders/send-expiration', {
      ...body,
      schoolId: schoolIdForReminders,
    })) as { sent?: number; skipped?: number; message?: string };
    const extra =
      (data.skipped ?? 0) > 0
        ? ` (${data.skipped} skipped: cooldown or no email)`
        : '';
    toast({
      title: 'Reminders sent',
      description: `Sent ${data.sent ?? 0} email(s).${extra}`,
    });
  };

  const setTab = (value: string) => {
    if (value === 'staff' || value === 'assignments') {
      setSearchParams({ tab: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const loadAssignments = useCallback(async () => {
    if (!effectiveSchoolId) return;
    setLoadingAssignments(true);
    try {
      const statuses = ['PENDING', 'REJECTED', 'EXPIRED'] as const;
      const chunks = await Promise.all(
        statuses.map((status) =>
          requirementService.list({
            schoolId: effectiveSchoolId,
            ...(isBranchDirector && branchId ? { branchId } : {}),
            status,
          }),
        ),
      );
      const unique = new Map<string, Requirement>();
      chunks.flat().forEach((row) => unique.set(row.id, row));
      setAssignmentRows(Array.from(unique.values()));
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load requirement assignments',
      });
      setAssignmentRows([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, [effectiveSchoolId, isBranchDirector, branchId]);

  useEffect(() => {
    if (tab === 'assignments') {
      void loadAssignments();
    }
  }, [tab, loadAssignments]);

  if (authLoading || roleLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user || isParent || !canManageSchool) {
    return null;
  }

  if (!isAdmin && !schoolId) {
    return null;
  }

  if (isAdmin && !schoolId && adminSchools === null) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full max-w-md" />
      </div>
    );
  }

  if (isAdmin && !schoolId && adminSchools && adminSchools.length === 0) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No schools available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All school documents, filters, and review. Staff coverage and bulk upload are on the second tab.
          </p>
        </div>
        {isAdmin && !schoolId ? (
          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-sm text-muted-foreground whitespace-nowrap">School</span>
            <Select value={adminSchoolId} onValueChange={setAdminSchoolId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent>
                {(adminSchools ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            All documents
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Staff coverage
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Clock className="h-4 w-4" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 mt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sending30 || !schoolIdForReminders}
              onClick={async () => {
                setSending30(true);
                try {
                  await postExpirationReminders({ threshold: 30 });
                } catch (e: unknown) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: e instanceof Error ? e.message : 'Failed to send reminders',
                  });
                } finally {
                  setSending30(false);
                }
              }}
              className="gap-2"
            >
              {sending30 ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              30-day reminders
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sending7 || !schoolIdForReminders}
              onClick={async () => {
                setSending7(true);
                try {
                  await postExpirationReminders({ threshold: 7 });
                } catch (e: unknown) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: e instanceof Error ? e.message : 'Failed to send reminders',
                  });
                } finally {
                  setSending7(false);
                }
              }}
              className="gap-2"
            >
              {sending7 ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              7-day reminders
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={sendingExpired || !schoolIdForReminders}
              onClick={async () => {
                setSendingExpired(true);
                try {
                  await postExpirationReminders({ threshold: 0, includeExpired: true });
                } catch (e: unknown) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: e instanceof Error ? e.message : 'Failed to send reminders',
                  });
                } finally {
                  setSendingExpired(false);
                }
              }}
              className="gap-2"
            >
              {sendingExpired ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Expired reminders
            </Button>
            <p className="text-xs text-muted-foreground self-center max-w-md">
              Same-tier reminders are not re-sent within the cooldown window.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{normalized.length}</div>
                <div className="text-sm text-muted-foreground">Loaded</div>
              </CardContent>
            </Card>
            <Card className={pendingCount > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Pending review</div>
              </CardContent>
            </Card>
            <Card className={expiringSoonCount > 0 ? 'border-orange-200' : ''}>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{expiringSoonCount}</div>
                <div className="text-sm text-muted-foreground">Expiring ≤30 days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Button variant="outline" size="sm" onClick={() => void loadDocuments()} disabled={loadingDocs}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingDocs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <CardDescription>Search applies to file name and owner fields on the server.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={ownerScope} onValueChange={(v) => setOwnerScope(v as typeof ownerScope)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Owner scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All owners</SelectItem>
                    <SelectItem value="teachers">Staff (teachers) only</SelectItem>
                    <SelectItem value="student_linked">Student-linked only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={reviewFilter} onValueChange={(v) => setReviewFilter(v as typeof reviewFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Review" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All review states</SelectItem>
                    <SelectItem value="pending">Pending review</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {documentTypeOptions.map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={expiringWithin30 ? 'secondary' : 'outline'}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setExpiringWithin30((v) => !v)}
                  >
                    Expiring ≤30 days
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Documents ({filteredRows.length}
                {filteredRows.length !== normalized.length ? ` of ${normalized.length}` : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 pt-0">
              <SchoolDocumentsTable
                rows={filteredRows}
                loading={loadingDocs}
                onView={(row) => {
                  setViewRow(row);
                  setViewOpen(true);
                }}
                onReview={(row) => {
                  setSelectedRow(row);
                  setReviewOpen(true);
                }}
              />
            </CardContent>
          </Card>

          <DocumentReviewDialog
            document={selectedRow?.legacyDialog ?? null}
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            onReviewComplete={() => {
              setReviewOpen(false);
              setSelectedRow(null);
              void loadDocuments();
            }}
          />

          <DocumentViewerModal
            document={viewRow?.legacyDialog as never}
            open={viewOpen}
            onOpenChange={setViewOpen}
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <Suspense
            fallback={
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading staff coverage…
              </div>
            }
          >
            <TeacherCompliance />
          </Suspense>
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending and expiring assignments</CardTitle>
              <CardDescription>
                Requirements that still need upload or review action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAssignments ? (
                <p className="text-sm text-muted-foreground">Loading assignments…</p>
              ) : assignmentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending assignments found.</p>
              ) : (
                <div className="space-y-2">
                  {assignmentRows.map((a) => (
                    <div key={a.id} className="rounded border p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{a.documentType?.name ?? a.documentTypeId}</p>
                        <p className="text-xs text-muted-foreground">
                          User: {a.user?.email ?? a.userId ?? '—'}
                        </p>
                      </div>
                      <RequirementStatusBadge kind="requirement" status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
