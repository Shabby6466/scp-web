import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { userService } from '@/services/userService';
import { studentParentService } from '@/services/studentParentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Phone, Users, Calendar } from 'lucide-react';
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

const AdminParents = () => {
  const { schoolId, isAdmin } = useUserRole();
  const [parents, setParents] = useState<Parent[]>([]);
  const [filteredParents, setFilteredParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchParents();
  }, [schoolId, isAdmin]);

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
        <CardHeader>
          <CardTitle>Parent Directory</CardTitle>
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
                              <span>Registered: {new Date(parent.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {parent.students.length} {parent.students.length === 1 ? 'child' : 'children'}
                        </Badge>
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
    </div>
  );
};

export default AdminParents;