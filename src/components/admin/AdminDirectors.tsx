import { useState, useEffect } from 'react';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Trash2, Search, Building2, ShieldCheck, MapPin } from 'lucide-react';
import { branchService } from '@/services/branchService';
import { unwrapList } from '@/lib/api';

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface DirectorUser {
  id: string;
  full_name?: string;
  name?: string;
  email: string;
  school_id?: string;
  schoolId?: string;
  branch_id?: string;
  branchId?: string;
  school?: School;
  branch?: Branch;
}

interface Branch {
  id: string;
  name?: string;
  branch_name: string;
}

interface DirectorAssignment {
  id: string;
  user_id: string;
  school_id: string;
  branch_id?: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  school: School;
  branch?: Branch;
}

export const AdminDirectors = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [assignments, setAssignments] = useState<DirectorAssignment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [newDirector, setNewDirector] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [createMode, setCreateMode] = useState<'otp' | 'manual'>('otp');
  const [manualPassword, setManualPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchBranches(selectedSchool);
    } else {
      setBranches([]);
      setSelectedBranch('');
    }
  }, [selectedSchool]);

  const fetchBranches = async (schoolId: string) => {
    try {
      const data = await branchService.listBySchool(schoolId);
      const rows = unwrapList<Branch>(data).map((b) => ({
        ...b,
        branch_name: b.branch_name ?? b.name ?? 'Branch',
      }));
      setBranches(rows);
    } catch {
      setBranches([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [schoolsData, directorsData] = await Promise.all([
        schoolService.list(),
        userService.list({ role: 'director' }),
      ]);

      setSchools(unwrapList<School>(schoolsData));
      
      const transformedAssignments = unwrapList<DirectorUser>(directorsData).map((assignment) => {
        const schoolId = assignment.school_id ?? assignment.schoolId ?? assignment.school?.id ?? '';
        const userId = assignment.id;
        const displayName =
          assignment.full_name ?? assignment.name ?? '';
        const email = assignment.email ?? '';
        const sch = assignment.school;
        return {
          id: userId,
          user_id: userId,
          school_id: schoolId,
          branch_id: assignment.branch_id ?? assignment.branchId ?? assignment.branch?.id,
          user: {
            id: userId,
            full_name: displayName,
            email,
          },
          school: {
            id: sch?.id ?? schoolId,
            name: sch?.name ?? '',
            city: sch?.city ?? '',
            state: sch?.state ?? '',
          },
          branch: assignment.branch || null,
        };
      });
      
      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirector = async () => {
    if (!selectedSchool || !newDirector.first_name.trim() || !newDirector.last_name.trim() || !newDirector.email.trim()) {
      toast.error('Please provide school, first name, last name, and email');
      return;
    }

    const otherDirector = assignments.find(
      (a) => a.school_id === selectedSchool,
    );
    if (otherDirector) {
      toast.error(
        `This school already has a director (${otherDirector.user.full_name}). Remove that assignment first, then assign a new director.`,
      );
      return;
    }

    const branchPayload =
      !selectedBranch || selectedBranch === '_none_' ? null : selectedBranch;

    try {
      const payload: Record<string, unknown> = {
        first_name: newDirector.first_name.trim(),
        last_name: newDirector.last_name.trim(),
        email: newDirector.email.trim().toLowerCase(),
        role: 'DIRECTOR',
        school_id: selectedSchool,
        branch_id: branchPayload,
      };
      if (createMode === 'manual') {
        if (manualPassword.trim().length < 8) {
          toast.error('Manual mode needs a password with at least 8 characters.');
          return;
        }
        payload.password = manualPassword.trim();
      }
      await userService.create(payload);

      toast.success(
        createMode === 'manual'
          ? 'Director created with manual password.'
          : 'Director account created. OTP invite sent (if enabled).',
      );
      setSelectedSchool('');
      setSelectedBranch('');
      setNewDirector({ first_name: '', last_name: '', email: '' });
      setCreateMode('otp');
      setManualPassword('');
      fetchData();
    } catch (error: unknown) {
      console.error('Error creating director:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create director';
      toast.error(message);
    }
  };

  const handleRemoveDirector = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this director account?")) return;
    try {
      await userService.remove(assignmentId);

      toast.success('Director account deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error removing director:', error);
      toast.error('Failed to delete director');
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      assignment.user.full_name.toLowerCase().includes(searchLower) ||
      assignment.user.email.toLowerCase().includes(searchLower) ||
      assignment.school.name.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card>
        <CardHeader>
          <CardTitle>Create Director</CardTitle>
          <CardDescription>
            Create a dedicated director account and assign it to a school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Select School</Label>
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

            <div className="space-y-2">
              <Label>First name</Label>
              <Input
                value={newDirector.first_name}
                onChange={(e) =>
                  setNewDirector((prev) => ({ ...prev, first_name: e.target.value }))
                }
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                value={newDirector.last_name}
                onChange={(e) =>
                  setNewDirector((prev) => ({ ...prev, last_name: e.target.value }))
                }
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Branch (Optional)</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={!selectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder={branches.length > 0 ? "Choose a branch" : "No branches available"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Whole School (All Locations)</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newDirector.email}
                onChange={(e) =>
                  setNewDirector((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="director@school.com"
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

            <div className="flex items-end">
              <Button
                onClick={handleCreateDirector}
                className="w-full h-10 shadow-sm"
                disabled={
                  !selectedSchool ||
                  !newDirector.first_name.trim() ||
                  !newDirector.last_name.trim() ||
                  !newDirector.email.trim()
                }
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Director
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Director Assignments</CardTitle>
              <CardDescription>
                {assignments.length} director{assignments.length !== 1 ? 's' : ''} assigned
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
          {filteredAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No assignments found' : 'No directors assigned yet'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{assignment.user.full_name}</p>
                        <Badge variant="secondary">Director</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{assignment.user.email}</p>
                      <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {assignment.school.name}
                      </p>
                      {assignment.branch && (
                        <p className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          Branch: {assignment.branch.branch_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3" />
                        {assignment.school.city}, {assignment.school.state}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveDirector(assignment.id)}
                    >
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
};
