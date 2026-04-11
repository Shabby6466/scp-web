import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, unwrapList } from "@/lib/api";
import { GraduationCap, Search, Command } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentComplianceSummary } from "./StudentComplianceSummary";
import { StudentEmptyState } from "./StudentEmptyState";
import { StudentListItem } from "./StudentListItem";
import { PageTransition } from "@/components/ui/animations";

interface StudentCompliance {
  id: string;
  name: string;
  school_name: string;
  total_docs: number;
  expired_docs: number;
  expiring_docs: number;
  is_compliant: boolean;
}

interface StudentComplianceBreakdownProps {
  schoolId?: string;
  branchId?: string;
  isAdmin?: boolean;
  onImportRoster?: () => void;
  onInviteParent?: () => void;
}

export const StudentComplianceBreakdown = ({ 
  schoolId, 
  branchId, 
  isAdmin,
  onImportRoster,
  onInviteParent,
}: StudentComplianceBreakdownProps) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStudentCompliance();
  }, [schoolId, branchId]);

  const fetchStudentCompliance = async () => {
    try {
      if (!schoolId) {
        setStudents([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.set('role', 'STUDENT');
      if (branchId) params.set('branchId', branchId);
      params.set('limit', '500');

      const studentsData = await api
        .get(`/schools/${schoolId}/users?${params.toString()}`)
        .then(unwrapList);

      const studentCompliance: StudentCompliance[] = [];

      for (const student of studentsData || []) {
        const docs = await api.get(`/documents/search?ownerUserId=${student.id}`);

        const expiredDocs = (docs || []).filter((d: any) => 
          d.status === 'expired' || 
          (d.expiration_date && new Date(d.expiration_date) < new Date())
        ).length;

        const expiringDocs = (docs || []).filter((d: any) => {
          if (!d.expiration_date) return false;
          const expDate = new Date(d.expiration_date);
          const today = new Date();
          const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
          return expDate >= today && expDate <= sixtyDays;
        }).length;

        studentCompliance.push({
          id: student.id,
          name: `${student.first_name} ${student.last_name}`,
          school_name: student.school_name || student.schools?.name || 'Unknown',
          total_docs: (docs || []).length,
          expired_docs: expiredDocs,
          expiring_docs: expiringDocs,
          is_compliant: expiredDocs === 0
        });
      }

      setStudents(studentCompliance);
    } catch (error) {
      console.error('Error fetching student compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => 
    students.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.school_name.toLowerCase().includes(search.toLowerCase())
    ), [students, search]
  );

  const compliantCount = students.filter(s => s.is_compliant).length;
  const nonCompliantCount = students.filter(s => !s.is_compliant).length;
  const expiringCount = students.filter(s => s.expiring_docs > 0).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Card variant="elevated">
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Summary Stats */}
        <StudentComplianceSummary
          totalStudents={students.length}
          compliantCount={compliantCount}
          nonCompliantCount={nonCompliantCount}
          expiringCount={expiringCount}
        />

        {/* Main Card */}
        <Card variant="elevated">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                Student Compliance
              </CardTitle>
              {students.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-600 font-medium">{compliantCount} compliant</span>
                  {nonCompliantCount > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-destructive font-medium">{nonCompliantCount} issues</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <StudentEmptyState
                onImportRoster={onImportRoster || (() => {})}
                onInviteParent={onInviteParent || (() => {})}
              />
            ) : (
              <>
                {/* Enhanced Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-16 h-11 bg-muted/50 border-border/50 focus:bg-background"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                    <Command className="h-3 w-3" />
                    <span>K</span>
                  </div>
                </div>

                {/* Student List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {filteredStudents.length === 0 ? (
                    <StudentEmptyState
                      onImportRoster={onImportRoster || (() => {})}
                      onInviteParent={onInviteParent || (() => {})}
                      searchActive={true}
                    />
                  ) : (
                    filteredStudents.map((student) => (
                      <StudentListItem
                        key={student.id}
                        id={student.id}
                        name={student.name}
                        schoolName={student.school_name}
                        isCompliant={student.is_compliant}
                        expiredDocs={student.expired_docs}
                        expiringDocs={student.expiring_docs}
                        totalDocs={student.total_docs}
                        showSchool={isAdmin}
                        onClick={() => navigate(isAdmin ? `/admin/student/${student.id}` : `/child/${student.id}`)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};
