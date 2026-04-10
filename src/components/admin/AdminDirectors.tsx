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
import { UserPlus, Trash2, Search } from 'lucide-react';

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

interface DirectorAssignment {
  id: string;
  user_id: string;
  school_id: string;
  user: User;
  school: School;
}

export const AdminDirectors = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<DirectorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [schoolsData, usersData, directorsData] = await Promise.all([
        schoolService.list(),
        userService.list(),
        userService.list({ role: 'director' }),
      ]);

      setSchools(schoolsData || []);
      setUsers(usersData || []);
      
      const transformedAssignments = (directorsData || []).map((assignment: any) => ({
        id: assignment.id,
        user_id: assignment.user_id,
        school_id: assignment.school_id,
        user: assignment.user || assignment.profiles || { id: assignment.user_id, full_name: '', email: '' },
        school: assignment.school || assignment.schools || { id: assignment.school_id, name: '', city: '', state: '' },
      }));
      
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

    try {
      await userService.update(selectedUser, {
        role: 'director',
        school_id: selectedSchool,
      });

      toast.success('Director assigned successfully');
      setSelectedSchool('');
      setSelectedUser('');
      fetchData();
    } catch (error) {
      console.error('Error assigning director:', error);
      toast.error('Failed to assign director');
    }
  };

  const handleRemoveDirector = async (assignmentId: string) => {
    try {
      await userService.update(assignmentId, { role: null });

      toast.success('Director removed successfully');
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
    <div className="space-y-6">
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
              <Button onClick={handleAssignDirector} className="w-full">
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
                      <p className="text-sm font-medium text-primary">
                        {assignment.school.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
