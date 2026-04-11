import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, unwrapList } from "@/lib/api";
import { Users, Search, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface TeacherCompliance {
  id: string;
  name: string;
  school_name: string;
  certification_status: 'valid' | 'expiring' | 'expired' | 'none';
  background_check_status: 'valid' | 'expiring' | 'expired' | 'none';
  is_compliant: boolean;
}

interface TeacherComplianceBreakdownProps {
  schoolId?: string;
  branchId?: string;
  isAdmin?: boolean;
}

export const TeacherComplianceBreakdown = ({ schoolId, branchId, isAdmin }: TeacherComplianceBreakdownProps) => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTeacherCompliance();
  }, [schoolId, branchId]);

  const getStatus = (expiryDate: string | null): 'valid' | 'expiring' | 'expired' | 'none' => {
    if (!expiryDate) return 'none';
    const expiry = new Date(expiryDate);
    const today = new Date();
    const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    
    if (expiry < today) return 'expired';
    if (expiry <= sixtyDays) return 'expiring';
    return 'valid';
  };

  const fetchTeacherCompliance = async () => {
    try {
      if (!schoolId) {
        setTeachers([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.set('role', 'TEACHER');
      if (branchId) params.set('branchId', branchId);
      params.set('limit', '500');

      const teachersData = await api
        .get(`/schools/${schoolId}/users?${params.toString()}`)
        .then(unwrapList);

      const teacherCompliance: TeacherCompliance[] = (teachersData || []).map((teacher: any) => {
        const certStatus = getStatus(teacher.certification_expiry);
        const bgStatus = getStatus(teacher.background_check_expiry);
        const isCompliant = certStatus !== 'expired' && bgStatus !== 'expired';

        return {
          id: teacher.id,
          name: `${teacher.first_name} ${teacher.last_name}`,
          school_name: teacher.school_name || teacher.schools?.name || 'Unknown',
          certification_status: certStatus,
          background_check_status: bgStatus,
          is_compliant: isCompliant
        };
      });

      setTeachers(teacherCompliance);
    } catch (error) {
      console.error('Error fetching teacher compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.school_name.toLowerCase().includes(search.toLowerCase())
  );

  const compliantCount = teachers.filter(t => t.is_compliant).length;
  const nonCompliantCount = teachers.filter(t => !t.is_compliant).length;

  const getStatusBadge = (status: 'valid' | 'expiring' | 'expired' | 'none', label: string) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive" className="text-xs">{label} expired</Badge>;
      case 'expiring':
        return <Badge className="text-xs bg-yellow-100 text-yellow-800">{label} expiring</Badge>;
      case 'valid':
        return null;
      case 'none':
        return <Badge variant="outline" className="text-xs">No {label}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Teacher Compliance Breakdown
        </CardTitle>
        <CardDescription>
          <span className="text-green-600">{compliantCount} compliant</span>
          {nonCompliantCount > 0 && (
            <span className="text-red-600 ml-2">· {nonCompliantCount} non-compliant</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTeachers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teachers found"
              description={search ? "Try adjusting your search" : "No teachers added yet"}
            />
          ) : (
            filteredTeachers.map((teacher) => (
              <div 
                key={teacher.id}
                onClick={() => navigate(`/admin/teacher/${teacher.id}`)}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  teacher.is_compliant 
                    ? 'border-green-100 dark:border-green-900' 
                    : 'border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {teacher.is_compliant ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{teacher.name}</p>
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground">{teacher.school_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {getStatusBadge(teacher.certification_status, 'Cert')}
                  {getStatusBadge(teacher.background_check_status, 'BG')}
                  {teacher.is_compliant && 
                   teacher.certification_status === 'valid' && 
                   teacher.background_check_status === 'valid' && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Compliant
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
