import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { userService } from '@/services/userService';
import { studentParentService } from '@/services/studentParentService';
import { schoolService } from '@/services/schoolService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Search, Mail, Phone, Users, Calendar, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Parent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    school_name: string | null;
  }>;
}

/** `GET /student-parents/parent/:id` returns rows with nested `student`. */
function mapStudentLinksToDisplay(apiRows: unknown): Parent['students'] {
  const rows = Array.isArray(apiRows) ? apiRows : [];
  return rows.map((row: any) => {
    const s = row.student ?? row;
    const full = (s.name as string | undefined)?.trim() ?? '';
    const parts = full.split(/\s+/).filter(Boolean);
    return {
      id: s.id as string,
      first_name: parts[0] ?? '',
      last_name: parts.slice(1).join(' ') ?? '',
      school_name: (s.school?.name ?? s.branch?.name ?? null) as string | null,
    };
  });
}

function safeLocaleDate(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? '—' : raw.toLocaleDateString();
  }
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  }
  const s = String(raw).trim();
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

const AdminParents = () => {
  const { schoolId, isAdmin, isDirector, isBranchDirector } = useUserRole();
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [newParent, setNewParent] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    school_id: '' as string,
  });
  const [createMode, setCreateMode] = useState<'otp' | 'manual'>('otp');
  const [manualPassword, setManualPassword] = useState('');
  const [editParent, setEditParent] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const canAddParent =
    isAdmin || ((isDirector || isBranchDirector) && !!schoolId);

  useEffect(() => {
    fetchParents();
  }, [schoolId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await schoolService.list();
        setSchools(Array.isArray(data) ? data : []);
      } catch {
        setSchools([]);
      }
    })();
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [parents, searchQuery]);

  const fetchParents = async () => {
    try {
      // GET /users is admin-only; school directors must use /schools/:schoolId/users
      if (!schoolId && !isAdmin) {
        setParents([]);
        return;
      }

      const parentProfiles = await userService.list(
        schoolId
          ? { schoolId, role: 'PARENT' }
          : { role: 'PARENT' },
      );

      const parentsWithStudents = await Promise.all(
        (parentProfiles || []).map(async (profile: any) => {
          try {
            const linkRows = await studentParentService.getStudentsOfParent(profile.id);
            const displayName =
              profile.full_name ??
              profile.name ??
              [profile.first_name, profile.last_name].filter(Boolean).join(' ') ??
              profile.email ??
              'Parent';
            return {
              ...profile,
              full_name: displayName,
              created_at: profile.created_at ?? profile.createdAt ?? '',
              students: mapStudentLinksToDisplay(linkRows),
            };
          } catch {
            return {
              ...profile,
              full_name:
                profile.full_name ??
                profile.name ??
                [profile.first_name, profile.last_name].filter(Boolean).join(' ') ??
                profile.email ??
                'Parent',
              created_at: profile.created_at ?? profile.createdAt ?? '',
              students: [],
            };
          }
        })
      );

      setParents(parentsWithStudents);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading parents",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...parents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (parent) =>
          parent.full_name.toLowerCase().includes(query) ||
          parent.email.toLowerCase().includes(query) ||
          parent.phone?.toLowerCase().includes(query) ||
          parent.students.some(
            (student) =>
              student.first_name.toLowerCase().includes(query) ||
              student.last_name.toLowerCase().includes(query)
          )
      );
    }

    setFilteredParents(filtered);
  };

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newParent.email.trim().toLowerCase();
    const first = newParent.first_name.trim();
    const last = newParent.last_name.trim();
    if (!email || !first || !last) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Email, first name, and last name are required.',
      });
      return;
    }

    const payload: Record<string, unknown> = {
      email,
      role: 'PARENT',
      first_name: first,
      last_name: last,
    };
    if (createMode === 'manual') {
      if (manualPassword.trim().length < 8) {
        toast({
          variant: 'destructive',
          title: 'Password required',
          description: 'Manual mode needs a password with at least 8 characters.',
        });
        return;
      }
      payload.password = manualPassword.trim();
    }
    if (newParent.phone.trim()) {
      payload.phone = newParent.phone.trim();
    }

    setSaving(true);
    try {
      if (isAdmin) {
        if (newParent.school_id) {
          await userService.createInSchool(newParent.school_id, {
            ...payload,
            schoolId: newParent.school_id,
          });
        } else {
          await userService.create(payload);
        }
      } else if (schoolId) {
        await userService.createInSchool(schoolId, {
          ...payload,
          schoolId,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Cannot add parent',
          description: 'Your account is not linked to a school.',
        });
        return;
      }

      toast({
        title: 'Parent added',
        description:
          createMode === 'manual'
            ? `${first} ${last} was created with manual password.`
            : `${first} ${last} can sign in after email verification (if enabled).`,
      });
      setAddOpen(false);
      setNewParent({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        school_id: '',
      });
      setCreateMode('otp');
      setManualPassword('');
      await fetchParents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create parent';
      toast({ variant: 'destructive', title: 'Could not add parent', description: message });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (parent: Parent) => {
    const parts = parent.full_name.trim().split(/\s+/).filter(Boolean);
    setSelectedParent(parent);
    setEditParent({
      first_name: parts[0] ?? '',
      last_name: parts.slice(1).join(' '),
      email: parent.email,
      phone: parent.phone ?? '',
    });
    setEditOpen(true);
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;

    const first = editParent.first_name.trim();
    const last = editParent.last_name.trim();
    const email = editParent.email.trim().toLowerCase();
    if (!first || !last || !email) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'First name, last name, and email are required.',
      });
      return;
    }

    setSaving(true);
    try {
      await userService.update(selectedParent.id, {
        first_name: first,
        last_name: last,
        email,
        phone: editParent.phone.trim() || null,
      });
      toast({ title: 'Parent updated', description: 'Parent profile was updated successfully.' });
      setEditOpen(false);
      setSelectedParent(null);
      await fetchParents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update parent';
      toast({ variant: 'destructive', title: 'Could not update parent', description: message });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (parent: Parent) => {
    setSelectedParent(parent);
    setDeleteOpen(true);
  };

  const handleDeleteParent = async () => {
    if (!selectedParent) return;
    setSaving(true);
    try {
      await userService.remove(selectedParent.id);
      toast({ title: 'Parent deleted', description: 'Parent account removed successfully.' });
      setDeleteOpen(false);
      setSelectedParent(null);
      await fetchParents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete parent';
      toast({ variant: 'destructive', title: 'Could not delete parent', description: message });
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
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48 mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Children</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parents.reduce((acc, p) => acc + p.students.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Children per Parent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parents.length > 0
                ? (parents.reduce((acc, p) => acc + p.students.length, 0) / parents.length).toFixed(1)
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Parent Directory</CardTitle>
          {canAddParent && (
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add parent
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or child name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredParents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No parents found
              </div>
            ) : (
              filteredParents.map((parent) => (
                <Card key={parent.id}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{parent.full_name}</h3>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{parent.email}</span>
                            </div>
                            {parent.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{parent.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Registered: {safeLocaleDate(parent.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {parent.students.length} {parent.students.length === 1 ? 'child' : 'children'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(parent)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(parent)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>

                      {parent.students.length > 0 && (
                        <div className="pt-3 border-t">
                          <div className="text-sm font-medium mb-2">Children:</div>
                          <div className="flex flex-wrap gap-2">
                            {parent.students.map((student) => (
                              <Badge key={student.id} variant="outline">
                                {student.first_name} {student.last_name}
                                {student.school_name && ` • ${student.school_name}`}
                              </Badge>
                            ))}
                          </div>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add parent</DialogTitle>
            <DialogDescription>
              Creates a parent login. {isAdmin ? 'Optionally link them to a school.' : 'They are linked to your school.'}{' '}
              If email verification is on, they will receive an invite code.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddParent} className="space-y-3">
            {isAdmin && (
              <div className="space-y-2">
                <Label>School (optional)</Label>
                <Select
                  value={newParent.school_id || '_none_'}
                  onValueChange={(v) =>
                    setNewParent((p) => ({ ...p, school_id: v === '_none_' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Platform-wide (no school)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">No school (platform)</SelectItem>
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
              <Label htmlFor="parent-email">Email</Label>
              <Input
                id="parent-email"
                type="email"
                autoComplete="email"
                value={newParent.email}
                onChange={(e) => setNewParent((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="parent-fn">First name</Label>
                <Input
                  id="parent-fn"
                  value={newParent.first_name}
                  onChange={(e) => setNewParent((p) => ({ ...p, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-ln">Last name</Label>
                <Input
                  id="parent-ln"
                  value={newParent.last_name}
                  onChange={(e) => setNewParent((p) => ({ ...p, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-phone">Phone (optional)</Label>
              <Input
                id="parent-phone"
                type="tel"
                value={newParent.phone}
                onChange={(e) => setNewParent((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Account setup mode</Label>
              <Select value={createMode} onValueChange={(v: 'otp' | 'manual') => setCreateMode(v)}>
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
                  required
                />
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Create parent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedParent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit parent</DialogTitle>
            <DialogDescription>Update parent account details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateParent} className="space-y-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editParent.email}
                onChange={(e) => setEditParent((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={editParent.first_name}
                  onChange={(e) => setEditParent((p) => ({ ...p, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={editParent.last_name}
                  onChange={(e) => setEditParent((p) => ({ ...p, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={editParent.phone}
                onChange={(e) => setEditParent((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedParent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete parent account?</DialogTitle>
            <DialogDescription>
              {selectedParent
                ? `This will remove ${selectedParent.full_name} (${selectedParent.email}).`
                : 'This will remove the selected parent account.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteParent} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminParents;