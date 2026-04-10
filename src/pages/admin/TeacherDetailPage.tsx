import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import { documentTypeService } from "@/services/documentTypeService";
import { documentService } from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: string;
};

type StaffRequiredDocument = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
};

type TeacherDocument = {
  id: string;
  document_type: string;
  expiration_date: string | null;
  file_path: string;
};

type ChecklistItem = {
  requiredDoc: StaffRequiredDocument;
  status: "missing" | "uploaded";
  expiration?: string | null;
  documentId?: string | null;
};

export default function TeacherDetailPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) loadTeacherChecklist(teacherId);
  }, [teacherId]);

  const loadTeacherChecklist = async (id: string) => {
    setLoading(true);

    try {
      const teacherData = await userService.getDetail(id) as any;

      if (!teacherData) {
        toast({
          title: "Error",
          description: "Teacher not found",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }

      const mapped: Teacher = {
        id: teacherData.id,
        first_name: teacherData.first_name ?? teacherData.name?.split(' ')[0] ?? '',
        last_name: teacherData.last_name ?? teacherData.name?.split(' ').slice(1).join(' ') ?? '',
        email: teacherData.email ?? '',
        school_id: teacherData.school_id ?? teacherData.schoolId ?? '',
      };

      const [required, docs] = await Promise.all([
        documentTypeService.list({ schoolId: mapped.school_id, targetRole: 'TEACHER' }),
        documentService.listByOwner(id),
      ]);

      setTeacher(mapped);
      setChecklist(buildChecklist(required ?? [], (docs as any)?.data ?? docs ?? []));
    } catch {
      toast({
        title: "Error",
        description: "Failed to load teacher details",
        variant: "destructive",
      });
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const buildChecklist = (
    requiredDocs: StaffRequiredDocument[],
    docs: TeacherDocument[]
  ): ChecklistItem[] => {
    return requiredDocs.map((rd) => {
      const match = docs.find((d) => d.document_type === rd.category);
      if (!match)
        return {
          requiredDoc: rd,
          status: "missing" as const,
        };

      return {
        requiredDoc: rd,
        status: "uploaded" as const,
        expiration: match.expiration_date,
        documentId: match.id,
      };
    });
  };

  const getStatusBadge = (status: "missing" | "uploaded") => {
    if (status === "missing")
      return <Badge variant="destructive">Missing</Badge>;
    return <Badge variant="default">Uploaded</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {teacher.first_name} {teacher.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Document Checklist</h2>
        {checklist.length === 0 ? (
          <p className="text-muted-foreground">
            No staff requirements configured yet.
          </p>
        ) : (
          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.requiredDoc.id}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div>
                  <div className="font-medium">{item.requiredDoc.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.requiredDoc.is_mandatory ? "Required" : "Optional"} ·{" "}
                    {item.requiredDoc.category}
                    {item.expiration && ` · Expires ${item.expiration}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
