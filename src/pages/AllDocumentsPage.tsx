import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, GraduationCap, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userService } from "@/services/userService";
import { schoolService } from "@/services/schoolService";
import { documentTypeService } from "@/services/documentTypeService";
import { studentProfileService } from "@/services/studentProfileService";
import { useUserRole } from "@/hooks/useUserRole";
import { PersonFileCard } from "@/components/documents/PersonFileCard";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  branch_id: string | null;
  date_of_birth: string;
  documents: { id: string; category: string; status: string }[];
  requiredCount: number;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  branch_id: string | null;
  email: string;
  employment_status: string;
  documents: { id: string; document_type: string; expiration_date: string | null }[];
  requiredCount: number;
}

export default function AllDocumentsPage() {
  const navigate = useNavigate();
  const { schoolId, isAdmin } = useUserRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [studentRequirements, setStudentRequirements] = useState<number>(0);
  const [teacherRequirements, setTeacherRequirements] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, [schoolId, isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const effectiveSchoolId = schoolId && !isAdmin ? schoolId : undefined;

      const [studentReqRes, teacherReqRes] = await Promise.all([
        documentTypeService.list({ schoolId: effectiveSchoolId ?? undefined, targetRole: 'STUDENT' }),
        documentTypeService.list({ schoolId: effectiveSchoolId ?? undefined, targetRole: 'TEACHER' }),
      ]);

      const studentReqList: any[] = Array.isArray(studentReqRes) ? studentReqRes : (studentReqRes as any)?.data ?? [];
      const teacherReqList: any[] = Array.isArray(teacherReqRes) ? teacherReqRes : (teacherReqRes as any)?.data ?? [];

      setStudentRequirements(studentReqList.length);
      setTeacherRequirements(teacherReqList.length);

      let studentsList: any[] = [];
      if (effectiveSchoolId) {
        studentsList = await schoolService.listStudents(effectiveSchoolId);
      } else if (isAdmin) {
        const schs = await schoolService.list();
        const arr = Array.isArray(schs) ? schs : (schs as any)?.data ?? [];
        for (const sch of arr) {
          try {
            studentsList.push(
              ...(await schoolService.listStudents(sch.id)).map((p: any) => ({
                ...p,
                schoolId: p.schoolId ?? sch.id,
              })),
            );
          } catch {
            /* ignore */
          }
        }
      }

      const teachersRes = await (effectiveSchoolId
        ? userService.listTeachers(effectiveSchoolId)
        : userService.list({ role: 'TEACHER' }));
      const teachersList: any[] = Array.isArray(teachersRes) ? teachersRes : (teachersRes as any)?.data ?? [];

      const requiredCountByProfileId = new Map<string, number>();
      const studentIds = studentsList.map((s: any) => String(s.id));
      if (studentIds.length > 0) {
        try {
          const res = await studentProfileService.getRequiredDocumentTypeCounts(
            studentIds,
          );
          const counts = res?.counts ?? {};
          for (const [profileId, n] of Object.entries(counts)) {
            if (typeof n === "number") {
              requiredCountByProfileId.set(profileId, n);
            }
          }
        } catch {
          for (const id of studentIds) {
            requiredCountByProfileId.set(id, studentReqList.length);
          }
        }
      }

      setStudents(
        studentsList.map((s: any) => {
          const pid = String(s.id);
          return {
            id: pid,
            first_name: s.firstName ?? s.studentProfile?.firstName ?? s.name?.split(' ')[0] ?? '',
            last_name: s.lastName ?? s.studentProfile?.lastName ?? s.name?.split(' ').slice(1).join(' ') ?? '',
            school_id: s.schoolId ?? s.school_id ?? '',
            branch_id: s.branchId ?? null,
            date_of_birth: s.dateOfBirth ?? s.studentProfile?.dateOfBirth ?? '',
            documents: s.documents ?? [],
            requiredCount:
              requiredCountByProfileId.get(pid) ?? studentReqList.length,
          };
        })
      );

      setTeachers(
        teachersList.map((t: any) => ({
          id: t.id,
          first_name: t.teacherProfile?.firstName ?? t.name?.split(' ')[0] ?? '',
          last_name: t.teacherProfile?.lastName ?? t.name?.split(' ').slice(1).join(' ') ?? '',
          school_id: t.schoolId ?? '',
          branch_id: t.branchId ?? null,
          email: t.email ?? '',
          employment_status: t.teacherProfile?.employmentStatus ?? 'active',
          documents: t.documents ?? [],
          requiredCount: teacherReqList.length,
        }))
      );
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterBySearch = <T extends { first_name: string; last_name: string }>(
    items: T[]
  ): T[] => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.first_name.toLowerCase().includes(query) ||
        item.last_name.toLowerCase().includes(query)
    );
  };

  const filterByStatus = <
    T extends { documents: { id: string }[]; requiredCount: number }
  >(
    items: T[]
  ): T[] => {
    if (filterStatus === "all") return items;
    return items.filter((item) => {
      const docCount = item.documents.length;
      const required = item.requiredCount;
      const isComplete = docCount >= required;
      const hasMissing = docCount < required;

      if (filterStatus === "complete") return isComplete;
      if (filterStatus === "incomplete") return hasMissing;
      return true;
    });
  };

  const filteredStudents = filterByStatus(filterBySearch(students));
  const filteredTeachers = filterByStatus(filterBySearch(teachers));

  const handleStudentClick = (studentId: string) => {
    navigate(`/person-file/student/${studentId}`);
  };

  const handleTeacherClick = (teacherId: string) => {
    navigate(`/person-file/teacher/${teacherId}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and manage documents for all students and staff
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Students</h2>
            <Badge variant="secondary" className="ml-2">
              {filteredStudents.length}
            </Badge>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredStudents.map((student) => (
              <PersonFileCard
                key={student.id}
                id={student.id}
                firstName={student.first_name}
                lastName={student.last_name}
                type="student"
                documentCount={student.documents.length}
                requiredCount={student.requiredCount}
                onClick={() => handleStudentClick(student.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Staff Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Staff</h2>
            <Badge variant="secondary" className="ml-2">
              {filteredTeachers.length}
            </Badge>
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No staff found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredTeachers.map((teacher) => (
              <PersonFileCard
                key={teacher.id}
                id={teacher.id}
                firstName={teacher.first_name}
                lastName={teacher.last_name}
                type="teacher"
                documentCount={teacher.documents.length}
                requiredCount={teacher.requiredCount}
                onClick={() => handleTeacherClick(teacher.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
