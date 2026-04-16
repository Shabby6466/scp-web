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

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Branch {
  id: string;
  branch_name: string;
}

interface DirectorAssignment {
  id: string;
  user_id: string;
  school_id: string;
  branch_id?: string;
  user: User;
  school: School;
  branch?: Branch;
}

export const AdminDirectors = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<DirectorAssignment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
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
      setBranches(data || []);
    } catch {
      setBranches([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [schoolsData, usersData, directorsData] = await Promise.all([
        schoolService.list(),
        userService.list(),
        userService.list({ role: 'director' }),
      ]);

      setSchools((schoolsData as School[]) || []);
      setUsers((usersData as User[]) || []);
      
      const transformedAssignments = (directorsData || []).map((assignment: any) => {
        const schoolId = assignment.school_id ?? assignment.schoolId ?? '';
        const userId = assignment.user_id ?? assignment.userId ?? assignment.id;
        const u = assignment.user || assignment.profiles;
        const displayName =
          u?.full_name ?? u?.name ?? assignment.name ?? '';
        const email = u?.email ?? assignment.email ?? '';
        const sch = assignment.school || assignment.schools;
        return {
          id: assignment.id,
          user_id: userId,
          school_id: schoolId,
          branch_id: assignment.branch_id ?? assignment.branchId,
          user: {
            id: u?.id ?? userId,
            full_name: displayName,
            email,
          },
          school: {
            id: sch?.id ?? schoolId,
            name: sch?.name ?? '',
            city: sch?.city ?? '',
            state: sch?.state ?? '',
          },
          branch: assignment.branch || assignment.branches || null,
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

  const handleAssignDirector = async () => {
    if (!selectedSchool || !selectedUser) {
      toast.error('Please select both a school and a user');
      return;
    }

    // Check if assignment already exists
    const existingAssignment = assignments.find(
      (a) => a.school_id === selectedSchool && a.user_id === selectedUser
    );

    if (existingAssignment) {
      toast.error('This user is already a director at this school');
      return;
    }

    const otherDirector = assignments.find(
      (a) => a.school_id === selectedSchool && a.user_id !== selectedUser,
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
      await userService.update(selectedUser, {
        role: 'director',
        school_id: selectedSchool,
        branch_id: branchPayload,
      });

      toast.success('Director assigned successfully');
      setSelectedSchool('');
      setSelectedBranch('');
      setSelectedUser('');
      fetchData();
    } catch (error: unknown) {
      console.error('Error assigning director:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to assign director';
      toast.error(message);
    }
  };

  const handleRemoveDirector = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this director's administrative access?")) return;
    try {
      await userService.update(assignmentId, { 
        role: null,
        school_id: null,
        branch_id: null
      });

      toast.success('Director access revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Error removing director:', error);
      toast.error('Failed to remove director');
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
          <CardTitle>Assign Director to School</CardTitle>
          <CardDescription>
            Directors have full administrative access to their assigned school's data
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
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleAssignDirector} className="w-full h-10 shadow-sm" disabled={!selectedSchool || !selectedUser}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Director
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
