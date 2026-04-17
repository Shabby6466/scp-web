import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Trash2, Search, Building2, MapPin, UsersRound } from 'lucide-react';
import { branchService } from '@/services/branchService';
import { unwrapList, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface Branch {
  id: string;
  name?: string;
  branch_name: string;
}

interface BranchDirectorUser {
  id: string;
  full_name?: string;
  name?: string;
  email: string;
  school_id?: string;
  schoolId?: string;
  branch_id?: string;
  branchId?: string;
  school?: School;
  branch?: Branch | null;
}

interface BranchDirectorRow {
  id: string;
  school_id: string;
  branch_id: string | null;
  user: { id: string; full_name: string; email: string };
  school: School;
  branch: Branch | null;
}

type Mode = 'admin' | 'school';

function mapBranchDirectorRows(rows: BranchDirectorUser[]): BranchDirectorRow[] {
  return rows.map((u) => {
    const schoolId = u.school_id ?? u.schoolId ?? u.school?.id ?? '';
    const sch = u.school;
    const br = u.branch;
    const displayName = u.full_name ?? u.name ?? '';
    return {
      id: u.id,
      school_id: schoolId,
      branch_id: u.branch_id ?? u.branchId ?? u.branch?.id ?? null,
      user: {
        id: u.id,
        full_name: displayName,
        email: u.email ?? '',
      },
      school: {
        id: sch?.id ?? schoolId,
        name: sch?.name ?? '',
        city: sch?.city ?? '',
        state: sch?.state ?? '',
      },
      branch: br
        ? {
            id: br.id,
            branch_name: (br as Branch).branch_name ?? br.name ?? 'Branch',
            name: br.name,
          }
        : null,
    };
  });
}

export function BranchDirectorsManagement({ mode }: { mode: Mode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [rows, setRows] = useState<BranchDirectorRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [createMode, setCreateMode] = useState<'otp' | 'manual'>('otp');
  const [manualPassword, setManualPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const schoolIdForSchoolMode = authUser?.schoolId ?? '';

  const fetchBranches = useCallback(async (schoolId: string) => {
    if (!schoolId) {
      setBranches([]);
      return;
    }
    try {
      const data = await branchService.listBySchool(schoolId);
      const raw = Array.isArray(data) ? data : unwrapList<Branch>(data);
      const mapped = raw.map((b) => ({
        ...b,
        branch_name: (b as Branch).branch_name ?? b.name ?? 'Branch',
      }));
      setBranches(mapped);
    } catch {
      setBranches([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (mode === 'admin') {
        const [schoolsData, listData] = await Promise.all([
          schoolService.list(),
          userService.list({ role: 'branch_director' }),
        ]);
        setSchools(unwrapList<School>(schoolsData));
        setRows(mapBranchDirectorRows(unwrapList<BranchDirectorUser>(listData)));
      } else {
        if (!schoolIdForSchoolMode) {
          setRows([]);
          return;
        }
        const listData = await userService.list({
          role: 'branch_director',
          schoolId: schoolIdForSchoolMode,
        });
        setRows(mapBranchDirectorRows(unwrapList<BranchDirectorUser>(listData)));
      }
    } catch (error) {
      console.error('Error loading branch directors:', error);
      toast.error('Failed to load branch directors');
    } finally {
      setLoading(false);
    }
  }, [mode, schoolIdForSchoolMode]);

  useEffect(() => {
    if (authLoading) return;
    if (mode === 'school' && authUser?.role !== 'DIRECTOR') return;
    fetchData();
  }, [authLoading, authUser?.role, fetchData, mode]);

  useEffect(() => {
    if (mode === 'admin' && selectedSchool) {
      fetchBranches(selectedSchool);
    } else if (mode === 'admin') {
      setBranches([]);
      setSelectedBranch('');
    }
  }, [mode, selectedSchool, fetchBranches]);

  useEffect(() => {
    if (mode === 'school' && schoolIdForSchoolMode) {
      fetchBranches(schoolIdForSchoolMode);
    }
  }, [mode, schoolIdForSchoolMode, fetchBranches]);

  const handleCreate = async () => {
    const schoolId =
      mode === 'admin' ? selectedSchool : schoolIdForSchoolMode;
    if (
      !schoolId ||
      !selectedBranch ||
      !newUser.first_name.trim() ||
      !newUser.last_name.trim() ||
      !newUser.email.trim()
    ) {
      toast.error('Choose a branch, then enter first name, last name, and email');
      return;
    }

    const payload: Record<string, unknown> = {
      first_name: newUser.first_name.trim(),
      last_name: newUser.last_name.trim(),
      email: newUser.email.trim().toLowerCase(),
      role: 'BRANCH_DIRECTOR',
      branch_id: selectedBranch,
    };
    if (mode === 'admin') {
      payload.school_id = schoolId;
    }
    if (createMode === 'manual') {
      if (manualPassword.trim().length < 8) {
        toast.error('Manual mode needs a password with at least 8 characters.');
        return;
      }
      payload.password = manualPassword.trim();
    }

    try {
      const created =
        mode === 'admin'
          ? await userService.create(payload)
          : await userService.createInSchool(schoolId, payload);
      const uid =
        created && typeof created === 'object' && 'id' in created
          ? String((created as { id: string }).id)
          : null;
      if (uid) {
        try {
          await branchService.update(selectedBranch, {
            branchDirectorUserId: uid,
          });
        } catch (e) {
          console.warn('Branch director sync on branch failed:', e);
        }
      }

      toast.success(
        createMode === 'manual'
          ? 'Branch director created with manual password.'
          : 'Branch director created. OTP invite sent (if enabled).',
      );
      if (mode === 'admin') {
        setSelectedSchool('');
      }
      setSelectedBranch('');
      setNewUser({ first_name: '', last_name: '', email: '' });
      setCreateMode('otp');
      setManualPassword('');
      fetchData();
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.data?.message || error.message
          : error instanceof Error
            ? error.message
            : 'Failed to create branch director';
      toast.error(typeof message === 'string' ? message : 'Failed to create branch director');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Delete this branch director account?')) return;
    try {
      await userService.remove(id);
      toast.success('Account removed');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove account');
    }
  };

  const filtered = rows.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.user.full_name.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      r.school.name.toLowerCase().includes(q) ||
      (r.branch?.branch_name ?? '').toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  if (mode === 'school') {
    if (authUser?.role !== 'DIRECTOR') {
      return <Navigate to="/access-denied" replace />;
    }
    if (!schoolIdForSchoolMode) {
      return (
        <p className="text-muted-foreground text-sm">
          Your account is not linked to a school.
        </p>
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const schoolSelectId = mode === 'admin' ? selectedSchool : schoolIdForSchoolMode;
  const branchSelectDisabled =
    mode === 'admin' ? !selectedSchool : !schoolIdForSchoolMode;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Add branch director
          </CardTitle>
          <CardDescription>
            Create an account with the branch director role and assign it to a branch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {mode === 'admin' && (
              <div className="space-y-2">
                <Label>School</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name} ({school.city}, {school.state})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={branchSelectDisabled}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      branches.length > 0 ? 'Choose a branch' : 'No branches yet'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>First name</Label>
              <Input
                value={newUser.first_name}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, first_name: e.target.value }))
                }
                placeholder="Jane"
              />
            </div>

            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                value={newUser.last_name}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, last_name: e.target.value }))
                }
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="branch.director@school.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Account setup</Label>
              <Select
                value={createMode}
                onValueChange={(v: 'otp' | 'manual') => setCreateMode(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otp">OTP invite (user sets password)</SelectItem>
                  <SelectItem value="manual">Manual password</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createMode === 'manual' && (
              <div className="space-y-2">
                <Label>Temporary password *</Label>
                <Input
                  type="password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                />
              </div>
            )}

            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                className="w-full h-10 shadow-sm"
                disabled={
                  !schoolSelectId ||
                  !selectedBranch ||
                  !newUser.first_name.trim() ||
                  !newUser.last_name.trim() ||
                  !newUser.email.trim()
                }
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create branch director
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Branch directors</CardTitle>
              <CardDescription>
                {rows.length} account{rows.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No matches' : 'No branch directors yet'}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.user.full_name || r.user.email}</p>
                        <Badge variant="secondary">Branch director</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.user.email}</p>
                      <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {r.school.name}
                      </p>
                      <p className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {r.branch ? r.branch.branch_name : 'Not assigned to a branch'}
                      </p>
                      {mode === 'admin' && (
                        <p className="text-xs text-muted-foreground">
                          {r.school.city}, {r.school.state}
                        </p>
                      )}
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleRemove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const AdminBranchDirectors = () => (
  <BranchDirectorsManagement mode="admin" />
);

export const SchoolBranchDirectors = () => (
  <BranchDirectorsManagement mode="school" />
);
