import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentProfileService } from "@/services/studentProfileService";
import { documentTypeService } from "@/services/documentTypeService";
import { documentService } from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentUploadDialog from "@/components/DocumentUploadDialog";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  school_id: string | null;
  school_name: string | null;
};

type RequiredDocument = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
};

type Document = {
  id: string;
  category: string;
  status: string;
  expiration_date: string | null;
  file_path: string;
};

type ChecklistItem = {
  requiredDoc: RequiredDocument;
  status: "missing" | "pending" | "approved" | "rejected";
  expiration?: string | null;
  documentId?: string | null;
};

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      loadStudentChecklist(studentId);
    }
  }, [studentId]);

  const loadStudentChecklist = async (id: string) => {
    setLoading(true);
    try {
      const studentData = (await studentProfileService.getById(id)) as any;

      if (!studentData) {
        toast.error("Failed to load student");
        return;
      }

      const schoolId =
        studentData.schoolId ??
        studentData.school_id ??
        studentData.branch?.schoolId ??
        null;
      const mapped: Student = {
        id: studentData.id,
        first_name: studentData.firstName ?? studentData.first_name ?? '',
        last_name: studentData.lastName ?? studentData.last_name ?? '',
        date_of_birth: studentData.dateOfBirth
          ? new Date(studentData.dateOfBirth).toISOString().slice(0, 10)
          : studentData.date_of_birth ?? '',
        school_id: schoolId,
        school_name: studentData.school?.name ?? studentData.school_name ?? null,
      };
      setStudent(mapped);

      if (!mapped.school_id) {
        setChecklist([]);
        setStudents([
          {
            id: mapped.id,
            name: `${mapped.first_name} ${mapped.last_name}`.trim(),
          },
        ]);
        return;
      }

      setStudents([
        {
          id: mapped.id,
          name: `${mapped.first_name} ${mapped.last_name}`.trim(),
        },
      ]);

      const [requiredDocs, docs] = await Promise.all([
        documentTypeService.list({ schoolId: mapped.school_id, targetRole: 'STUDENT' }),
        documentService.listByOwner(id),
      ]);

      const docsArr = Array.isArray(docs) ? docs : (docs as any)?.data ?? [];
      const list = buildChecklist(requiredDocs ?? [], docsArr);
      setChecklist(list);
    } catch (error) {
      console.error("Error loading checklist:", error);
      toast.error("Failed to load checklist");
    } finally {
      setLoading(false);
    }
  };

  const buildChecklist = (
    requiredDocs: RequiredDocument[],
    docs: Document[]
  ): ChecklistItem[] => {
    return requiredDocs.map((rd) => {
      const match = docs.find(
        (d: any) =>
          (d as any).documentTypeId === rd.id ||
          d.category === rd.category,
      );
      if (!match) {
        return {
          requiredDoc: rd,
          status: "missing" as const,
        };
      }

      return {
        requiredDoc: rd,
        status: match.status as ChecklistItem["status"],
        expiration: match.expiration_date,
        documentId: match.id,
      };
    });
  };

  const getStatusBadge = (status: ChecklistItem["status"]) => {
    const variants: Record<ChecklistItem["status"], { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      missing: { variant: "outline", label: "Missing" },
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!student) {
    return <div className="p-4">Student not found</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">
          {student.first_name} {student.last_name}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.length === 0 ? (
            <p className="text-muted-foreground">
              No required documents configured for this school.
            </p>
          ) : (
            checklist.map((item) => (
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
                  <DocumentUploadDialog 
                    students={students}
                    onDocumentUploaded={() => {
                      if (studentId) loadStudentChecklist(studentId);
                    }}
                  >
                    <Button
                      size="sm"
                      variant={item.documentId ? "outline" : "default"}
                    >
                      {item.documentId ? "Replace" : "Upload"}
                    </Button>
                  </DocumentUploadDialog>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
