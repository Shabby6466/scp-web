import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { branchService } from '@/services/branchService';
import { unwrapList, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Mail,
  Calendar,
  UserPlus,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Briefcase,
  UsersRound,
} from 'lucide-react';

type TabKey = 'directors' | 'branch';

interface School {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

interface Branch {
  id: string;
  name?: string;
  branch_name: string;
}

interface DirectorRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  school_id: string;
  school_name: string;
  branch_label: string | null;
}

interface BranchDirectorRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  school_id: string;
  school_name: string;
  branch_id: string | null;
  branch_name: string | null;
}

function safeLocaleDate(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function displayNameFromUser(u: Record<string, unknown>): string {
  const fn = u.first_name ?? u.firstName;
  const ln = u.last_name ?? u.lastName;
  const joined = [fn, ln].filter(Boolean).join(' ').trim();
  if (joined) return joined;
  const n = (u.full_name ?? u.name ?? u.email ?? 'User') as string;
  return String(n);
}

export default function AdminLeadershipDirectory() {
  const { toast } = useToast();
  const { isAdmin, isDirector, isBranchDirector, schoolId } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const canManageDirectors = isAdmin;
  const canManageBranchDirectors = isAdmin || isDirector;

  const schoolBranchOnly =
    pathname === '/school/branch-directors' || pathname === '/school/branch-directors/';
  const onAdminDirectorsPath =
    pathname === '/admin/directors' || pathname === '/admin/directors/';
  const onAdminBranchPath =
    pathname === '/admin/branch-directors' || pathname === '/admin/branch-directors/';

  const pathImpliedTab: TabKey | null = onAdminDirectorsPath
    ? 'directors'
    : onAdminBranchPath || schoolBranchOnly
      ? 'branch'
      : null;

  const roleDefaultTab: TabKey = isAdmin ? 'directors' : 'branch';
  const defaultTab: TabKey = pathImpliedTab ?? roleDefaultTab;

  const tabFromUrl = searchParams.get('tab');
  const activeTab: TabKey =
    pathImpliedTab !== null
      ? pathImpliedTab
      : tabFromUrl === 'directors' || tabFromUrl === 'branch'
        ? tabFromUrl
        : defaultTab;

  const setActiveTab = (t: TabKey) => {
    if (schoolBranchOnly) return;
    if (isAdmin && (onAdminDirectorsPath || onAdminBranchPath)) {
      if (t === 'directors') {
        navigate('/admin/directors', { replace: true });
      } else {
        navigate('/admin/branch-directors', { replace: true });
      }
      return;
    }
    if (t === defaultTab) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: t }, { replace: true });
    }
  };

  const [loading, setLoading] = useState(true);
  const [searchDirectors, setSearchDirectors] = useState('');
  const [searchBranch, setSearchBranch] = useState('');

  const [schools, setSchools] = useState<School[]>([]);
  const [directors, setDirectors] = useState<DirectorRow[]>([]);
  const [branchRows, setBranchRows] = useState<BranchDirectorRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [addDirectorOpen, setAddDirectorOpen] = useState(false);
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [editDirectorOpen, setEditDirectorOpen] = useState(false);
  const [editBranchOpen, setEditBranchOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'director' | 'branch'; id: string; label: string } | null
  >(null);
  const [saving, setSaving] = useState(false);

  const [newDirector, setNewDirector] = useState({
    school_id: '',
    first_name: '',
    last_name: '',
    email: '',
    branch_id: '' as string,
  });
  const [dirCreateMode, setDirCreateMode] = useState<'otp' | 'manual'>('otp');
  const [dirManualPassword, setDirManualPassword] = useState('');

  const [newBd, setNewBd] = useState({
    first_name: '',
    last_name: '',
    email: '',
    branch_id: '',
    school_id: '' as string,
  });
  const [bdCreateMode, setBdCreateMode] = useState<'otp' | 'manual'>('otp');
  const [bdManualPassword, setBdManualPassword] = useState('');

  const [editDirector, setEditDirector] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [editBd, setEditBd] = useState({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    branch_id: '' as string,
  });

  const fetchBranchesForSchool = useCallback(async (sid: string) => {
    if (!sid) {
      setBranches([]);
      return;
    }
    try {
      const data = await branchService.listBySchool(sid);
      const raw = Array.isArray(data) ? data : unwrapList<Branch>(data);
      setBranches(
        raw.map((b) => ({
          ...b,
          branch_name: (b as Branch).branch_name ?? b.name ?? 'Branch',
        })),
      );
    } catch {
      setBranches([]);
    }
  }, []);

  const mapDirectors = useCallback((raw: unknown[]): DirectorRow[] => {
    return raw.map((u: any) => {
      const sch = u.school ?? {};
      const br = u.branch;
      const schoolIdVal = u.school_id ?? u.schoolId ?? sch.id ?? '';
      return {
        id: String(u.id),
        full_name: displayNameFromUser(u),
        email: String(u.email ?? ''),
        phone: (u.phone ?? null) as string | null,
        created_at: String(u.created_at ?? u.createdAt ?? ''),
        school_id: schoolIdVal,
        school_name: String(sch.name ?? ''),
        branch_label: br
          ? String((br as Branch).name ?? (br as Branch).branch_name ?? 'Branch')
          : null,
      };
    });
  }, []);

  const mapBranchDirectors = useCallback((raw: unknown[]): BranchDirectorRow[] => {
    return raw.map((u: any) => {
      const sch = u.school ?? {};
      const br = u.branch;
      const schoolIdVal = u.school_id ?? u.schoolId ?? sch.id ?? '';
      const bid = u.branch_id ?? u.branchId ?? br?.id ?? null;
      return {
        id: String(u.id),
        full_name: displayNameFromUser(u),
        email: String(u.email ?? ''),
        phone: (u.phone ?? null) as string | null,
        created_at: String(u.created_at ?? u.createdAt ?? ''),
        school_id: schoolIdVal,
        school_name: String(sch.name ?? ''),
        branch_id: bid ? String(bid) : null,
        branch_name: br
          ? String((br as Branch).branch_name ?? br.name ?? 'Branch')
          : null,
      };
    });
  }, []);

  const loadAll = useCallback(async () => {
    if (!isAdmin && !schoolId) {
      setDirectors([]);
      setBranchRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dirParams = isAdmin
        ? { role: 'director' as const }
        : { role: 'director' as const, schoolId: schoolId! };
      const bdParams = isAdmin
        ? { role: 'branch_director' as const }
        : { role: 'branch_director' as const, schoolId: schoolId! };

      const [dirList, bdList] = await Promise.all([
        userService.list(dirParams),
        userService.list(bdParams),
      ]);

      setDirectors(mapDirectors(unwrapList(dirList)));
      setBranchRows(mapBranchDirectors(unwrapList(bdList)));

      if (isAdmin) {
        const s = await schoolService.list();
        setSchools(Array.isArray(s) ? s : unwrapList(s));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, schoolId, mapDirectors, mapBranchDirectors, toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (addDirectorOpen && newDirector.school_id) {
      fetchBranchesForSchool(newDirector.school_id);
    }
  }, [addDirectorOpen, newDirector.school_id, fetchBranchesForSchool]);

  useEffect(() => {
    const sid = isAdmin ? newBd.school_id : schoolId ?? '';
    if (addBranchOpen && sid) fetchBranchesForSchool(sid);
  }, [addBranchOpen, isAdmin, newBd.school_id, schoolId, fetchBranchesForSchool]);

  const filteredDirectors = useMemo(() => {
    const q = searchDirectors.trim().toLowerCase();
    if (!q) return directors;
    return directors.filter(
      (d) =>
        d.full_name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.school_name.toLowerCase().includes(q) ||
        (d.branch_label ?? '').toLowerCase().includes(q),
    );
  }, [directors, searchDirectors]);

  const filteredBranch = useMemo(() => {
    const q = searchBranch.trim().toLowerCase();
    if (!q) return branchRows;
    return branchRows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.branch_name ?? '').toLowerCase().includes(q) ||
        r.school_name.toLowerCase().includes(q),
    );
  }, [branchRows, searchBranch]);

  const handleCreateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageDirectors) return;
    const sid = newDirector.school_id.trim();
    const first = newDirector.first_name.trim();
    const last = newDirector.last_name.trim();
    const email = newDirector.email.trim().toLowerCase();
    if (!sid || !first || !last || !email) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'School, first name, last name, and email are required.',
      });
      return;
    }
    if (directors.some((d) => d.school_id === sid)) {
      toast({
        variant: 'destructive',
        title: 'School already has a director',
        description: 'Remove the existing school director before assigning another.',
      });
      return;
    }
    const branchPayload =
      !newDirector.branch_id || newDirector.branch_id === '_none_'
        ? null
        : newDirector.branch_id;

    const payload: Record<string, unknown> = {
      first_name: first,
      last_name: last,
      email,
      role: 'DIRECTOR',
      school_id: sid,
      branch_id: branchPayload,
    };
    if (dirCreateMode === 'manual') {
      if (dirManualPassword.trim().length < 8) {
        toast({
          variant: 'destructive',
          title: 'Password',
          description: 'Manual mode needs a password with at least 8 characters.',
        });
        return;
      }
      payload.password = dirManualPassword.trim();
    }
    setSaving(true);
    try {
      await userService.create(payload);
      toast({
        title: 'Director created',
        description:
          dirCreateMode === 'manual'
            ? 'Account created with manual password.'
            : 'Invite sent if email verification is enabled.',
      });
      setAddDirectorOpen(false);
      setNewDirector({
        school_id: '',
        first_name: '',
        last_name: '',
        email: '',
        branch_id: '',
      });
      setDirCreateMode('otp');
      setDirManualPassword('');
      await loadAll();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.data?.message || err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create director';
      toast({ variant: 'destructive', title: 'Could not create director', description: String(message) });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranchDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBranchDirectors) return;
    const sid = (isAdmin ? newBd.school_id : schoolId) ?? '';
    const bid = newBd.branch_id.trim();
    const first = newBd.first_name.trim();
    const last = newBd.last_name.trim();
    const email = newBd.email.trim().toLowerCase();
    if (!sid || !bid || !first || !last || !email) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Branch, first name, last name, and email are required.',
      });
      return;
    }
    const payload: Record<string, unknown> = {
      first_name: first,
      last_name: last,
      email,
      role: 'BRANCH_DIRECTOR',
      branch_id: bid,
    };
    if (isAdmin) payload.school_id = sid;
    if (bdCreateMode === 'manual') {
      if (bdManualPassword.trim().length < 8) {
        toast({
          variant: 'destructive',
          title: 'Password',
          description: 'Manual mode needs a password with at least 8 characters.',
        });
        return;
      }
      payload.password = bdManualPassword.trim();
    }
    setSaving(true);
    try {
      const created = isAdmin
        ? await userService.create(payload)
        : await userService.createInSchool(sid, payload);
      const uid =
        created && typeof created === 'object' && 'id' in created
          ? String((created as { id: string }).id)
          : null;
      if (uid) {
        try {
          await branchService.update(bid, { branchDirectorUserId: uid });
        } catch {
          /* optional sync */
        }
      }
      toast({ title: 'Branch director created' });
      setAddBranchOpen(false);
      setNewBd({
        first_name: '',
        last_name: '',
        email: '',
        branch_id: '',
        school_id: '',
      });
      setBdCreateMode('otp');
      setBdManualPassword('');
      await loadAll();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.data?.message || err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create';
      toast({ variant: 'destructive', title: 'Could not create branch director', description: String(message) });
    } finally {
      setSaving(false);
    }
  };

  const openEditDirector = (d: DirectorRow) => {
    const parts = d.full_name.trim().split(/\s+/).filter(Boolean);
    setEditDirector({
      id: d.id,
      first_name: parts[0] ?? '',
      last_name: parts.slice(1).join(' '),
      email: d.email,
      phone: d.phone ?? '',
    });
    setEditDirectorOpen(true);
  };

  const openEditBranch = (r: BranchDirectorRow) => {
    const parts = r.full_name.trim().split(/\s+/).filter(Boolean);
    setEditBd({
      id: r.id,
      first_name: parts[0] ?? '',
      last_name: parts.slice(1).join(' '),
      email: r.email,
      phone: r.phone ?? '',
      branch_id: r.branch_id ?? '',
    });
    const sid = isAdmin ? r.school_id : schoolId ?? '';
    if (sid) void fetchBranchesForSchool(sid);
    setEditBranchOpen(true);
  };

  const handleUpdateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageDirectors) return;
    const first = editDirector.first_name.trim();
    const last = editDirector.last_name.trim();
    const email = editDirector.email.trim().toLowerCase();
    if (!first || !last || !email) {
      toast({ variant: 'destructive', title: 'Missing fields' });
      return;
    }
    setSaving(true);
    try {
      await userService.update(editDirector.id, {
        first_name: first,
        last_name: last,
        email,
        phone: editDirector.phone.trim() || null,
      });
      toast({ title: 'Director updated' });
      setEditDirectorOpen(false);
      await loadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBranchDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBranchDirectors) return;
    const first = editBd.first_name.trim();
    const last = editBd.last_name.trim();
    const email = editBd.email.trim().toLowerCase();
    const bid = editBd.branch_id.trim();
    if (!first || !last || !email || !bid) {
      toast({ variant: 'destructive', title: 'Missing fields' });
      return;
    }
    setSaving(true);
    try {
      await userService.update(editBd.id, {
        first_name: first,
        last_name: last,
        email,
        phone: editBd.phone.trim() || null,
        branch_id: bid,
      });
      try {
        await branchService.update(bid, { branchDirectorUserId: editBd.id });
      } catch {
        /* sync optional */
      }
      toast({ title: 'Branch director updated' });
      setEditBranchOpen(false);
      await loadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (kind: 'director' | 'branch', id: string, label: string) => {
    setDeleteTarget({ kind, id, label });
    setDeleteOpen(true);
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'director' && !canManageDirectors) return;
    if (deleteTarget.kind === 'branch' && !canManageBranchDirectors) return;
    setSaving(true);
    try {
      await userService.remove(deleteTarget.id);
      toast({
        title: deleteTarget.kind === 'director' ? 'Director removed' : 'Branch director removed',
      });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-4 h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
        {!schoolBranchOnly && (
          <TabsList className="h-auto min-h-10 w-full flex-wrap justify-start gap-1 py-1.5 sm:w-auto">
            <TabsTrigger value="directors" className="gap-2 px-4 py-2">
              <Briefcase className="h-4 w-4 shrink-0 opacity-70" />
              <span>School directors</span>
              {directors.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 tabular-nums font-normal">
                  {directors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="branch" className="gap-2 px-4 py-2">
              <UsersRound className="h-4 w-4 shrink-0 opacity-70" />
              <span>Branch directors</span>
              {branchRows.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 tabular-nums font-normal">
                  {branchRows.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        )}

        {!schoolBranchOnly && (
        <TabsContent value="directors" className="mt-0 space-y-6 focus-visible:ring-offset-0">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">School directors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{directors.length}</div>
              </CardContent>
            </Card>
            {isAdmin && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Schools in directory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">
                    {new Set(directors.map((d) => d.school_id).filter(Boolean)).size}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>School director directory</CardTitle>
              {canManageDirectors && (
                <Button type="button" size="sm" onClick={() => setAddDirectorOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add school director
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or school…"
                  value={searchDirectors}
                  onChange={(e) => setSearchDirectors(e.target.value)}
                  className="pl-10"
                />
              </div>
              {!canManageDirectors && (
                <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                  Only platform administrators can create or remove school directors. You can review
                  who is assigned below.
                </p>
              )}
              <div className="space-y-4">
                {filteredDirectors.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No school directors found</div>
                ) : (
                  filteredDirectors.map((d) => (
                    <Card key={d.id}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{d.full_name}</h3>
                              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 shrink-0" />
                                  <span>{d.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 shrink-0" />
                                  <span>{d.school_name || '—'}</span>
                                </div>
                                {d.branch_label && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span>{d.branch_label}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 shrink-0" />
                                  <span>Added {safeLocaleDate(d.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {canManageDirectors && (
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDirector(d)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => confirmDelete('director', d.id, d.full_name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="branch" className="mt-0 space-y-6 focus-visible:ring-offset-0">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Branch directors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{branchRows.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">With branch assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {branchRows.filter((r) => r.branch_id).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Branch director directory</CardTitle>
              {canManageBranchDirectors && (
                <Button type="button" size="sm" onClick={() => setAddBranchOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add branch director
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, branch, or school…"
                  value={searchBranch}
                  onChange={(e) => setSearchBranch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isBranchDirector && !isDirector && !isAdmin && (
                <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                  You can view branch directors in your scope. Adding or removing them requires a
                  school director or administrator.
                </p>
              )}
              <div className="space-y-4">
                {filteredBranch.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No branch directors found</div>
                ) : (
                  filteredBranch.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{r.full_name}</h3>
                              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 shrink-0" />
                                  <span>{r.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  <span>{r.branch_name ?? 'Not assigned to a branch'}</span>
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 shrink-0" />
                                    <span>{r.school_name || '—'}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 shrink-0" />
                                  <span>Added {safeLocaleDate(r.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {canManageBranchDirectors && (
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditBranch(r)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => confirmDelete('branch', r.id, r.full_name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add school director */}
      <Dialog open={addDirectorOpen} onOpenChange={setAddDirectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add school director</DialogTitle>
            <DialogDescription>
              Each school may have one school director. They receive the director dashboard and can
              manage branch directors, staff, and parents for that school.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDirector} className="space-y-3">
            <div className="space-y-2">
              <Label>School *</Label>
              <Select
                value={newDirector.school_id || undefined}
                onValueChange={(v) => setNewDirector((p) => ({ ...p, school_id: v, branch_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch (optional)</Label>
              <Select
                value={newDirector.branch_id || '_none_'}
                onValueChange={(v) =>
                  setNewDirector((p) => ({ ...p, branch_id: v === '_none_' ? '' : v }))
                }
                disabled={!newDirector.school_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Whole school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Whole school</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input
                  value={newDirector.first_name}
                  onChange={(e) => setNewDirector((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input
                  value={newDirector.last_name}
                  onChange={(e) => setNewDirector((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newDirector.email}
                onChange={(e) => setNewDirector((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Account setup</Label>
              <Select
                value={dirCreateMode}
                onValueChange={(v: 'otp' | 'manual') => setDirCreateMode(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otp">OTP invite</SelectItem>
                  <SelectItem value="manual">Manual password</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dirCreateMode === 'manual' && (
              <div className="space-y-2">
                <Label>Temporary password *</Label>
                <Input
                  type="password"
                  value={dirManualPassword}
                  onChange={(e) => setDirManualPassword(e.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDirectorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add branch director */}
      <Dialog open={addBranchOpen} onOpenChange={setAddBranchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add branch director</DialogTitle>
            <DialogDescription>
              Creates a branch director account and assigns them to a branch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBranchDirector} className="space-y-3">
            {isAdmin && (
              <div className="space-y-2">
                <Label>School *</Label>
                <Select
                  value={newBd.school_id || undefined}
                  onValueChange={(v) => setNewBd((p) => ({ ...p, school_id: v, branch_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={newBd.branch_id || undefined}
                onValueChange={(v) => setNewBd((p) => ({ ...p, branch_id: v }))}
                disabled={!(isAdmin ? newBd.school_id : schoolId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input
                  value={newBd.first_name}
                  onChange={(e) => setNewBd((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input
                  value={newBd.last_name}
                  onChange={(e) => setNewBd((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newBd.email}
                onChange={(e) => setNewBd((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Account setup</Label>
              <Select
                value={bdCreateMode}
                onValueChange={(v: 'otp' | 'manual') => setBdCreateMode(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otp">OTP invite</SelectItem>
                  <SelectItem value="manual">Manual password</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bdCreateMode === 'manual' && (
              <div className="space-y-2">
                <Label>Temporary password *</Label>
                <Input
                  type="password"
                  value={bdManualPassword}
                  onChange={(e) => setBdManualPassword(e.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddBranchOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit school director */}
      <Dialog open={editDirectorOpen} onOpenChange={setEditDirectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit school director</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDirector} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input
                  value={editDirector.first_name}
                  onChange={(e) => setEditDirector((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input
                  value={editDirector.last_name}
                  onChange={(e) => setEditDirector((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editDirector.email}
                onChange={(e) => setEditDirector((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editDirector.phone}
                onChange={(e) => setEditDirector((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDirectorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit branch director */}
      <Dialog open={editBranchOpen} onOpenChange={setEditBranchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit branch director</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBranchDirector} className="space-y-3">
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={editBd.branch_id || undefined}
                onValueChange={(v) => setEditBd((p) => ({ ...p, branch_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input
                  value={editBd.first_name}
                  onChange={(e) => setEditBd((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name *</Label>
                <Input
                  value={editBd.last_name}
                  onChange={(e) => setEditBd((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={editBd.email}
                onChange={(e) => setEditBd((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editBd.phone}
                onChange={(e) => setEditBd((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBranchOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove account?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove ${deleteTarget.label} (${deleteTarget.kind === 'director' ? 'school director' : 'branch director'}).`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} disabled={saving}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
