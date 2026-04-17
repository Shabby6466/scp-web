import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import { documentTypeService } from "@/services/documentTypeService";
import { documentService } from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: string;
};

/** Flattened requirement row (API may nest `category` as a ComplianceCategory object). */
type StaffRequiredDocument = {
  id: string;
  name: string;
  /** Human-readable secondary line (category name or document slug). */
  categoryLabel: string;
  description: string | null;
  is_mandatory: boolean;
};

type OwnerDocument = {
  id: string;
  documentTypeId: string | null;
  expiration: string | null;
};

type ChecklistItem = {
  requiredDoc: StaffRequiredDocument;
  status: "missing" | "uploaded";
  expiration?: string | null;
  documentId?: string | null;
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: T[] }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function complianceCategoryLabel(cat: unknown): string {
  if (cat == null || typeof cat !== "object") return "";
  const c = cat as { name?: string; slug?: string };
  return String(c.name ?? c.slug ?? "").trim();
}

function mapRequiredTypes(raw: unknown[]): StaffRequiredDocument[] {
  return raw.map((r: any) => {
    const nestedCat = complianceCategoryLabel(r.category);
    const slug = String(r.slug ?? "").trim();
    const categoryLabel = nestedCat || slug || String(r.name ?? "").trim();
    return {
      id: String(r.id),
      name: String(r.name ?? "Document"),
      categoryLabel,
      description: r.description != null ? String(r.description) : null,
      is_mandatory: !!(r.isMandatory ?? r.is_mandatory),
    };
  });
}

function mapOwnerDocuments(raw: unknown[]): OwnerDocument[] {
  return raw.map((d: any) => ({
    id: String(d.id),
    documentTypeId:
      d.documentType?.id != null
        ? String(d.documentType.id)
        : d.documentTypeId != null
          ? String(d.documentTypeId)
          : d.document_type_id != null
            ? String(d.document_type_id)
            : null,
    expiration:
      d.expiresAt ??
      d.expires_at ??
      d.expirationDate ??
      d.expiration_date ??
      null,
  }));
}

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

  const buildChecklist = (
    requiredDocs: StaffRequiredDocument[],
    ownerDocs: OwnerDocument[],
  ): ChecklistItem[] => {
    return requiredDocs.map((rd) => {
      const match = ownerDocs.find((d) => d.documentTypeId === rd.id);
      if (!match) {
        return {
          requiredDoc: rd,
          status: "missing" as const,
        };
      }

      return {
        requiredDoc: rd,
        status: "uploaded" as const,
        expiration: match.expiration,
        documentId: match.id,
      };
    });
  };

  const loadTeacherChecklist = async (id: string) => {
    setLoading(true);

    try {
      const teacherData = (await userService.getDetail(id)) as any;

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
        first_name:
          teacherData.first_name ?? teacherData.name?.split(" ")[0] ?? "",
        last_name:
          teacherData.last_name ??
          teacherData.name?.split(" ").slice(1).join(" ") ??
          "",
        email: teacherData.email ?? "",
        school_id: teacherData.school_id ?? teacherData.schoolId ?? "",
      };

      const [requiredRaw, docsPayload] = await Promise.all([
        documentTypeService.list({ schoolId: mapped.school_id, targetRole: "TEACHER" }),
        documentService.listByOwner(id),
      ]);

      const requiredList = unwrapList<any>(requiredRaw);
      const docsList = unwrapList<any>(docsPayload);

      setTeacher(mapped);
      setChecklist(
        buildChecklist(mapRequiredTypes(requiredList), mapOwnerDocuments(docsList)),
      );
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
      <div>
        <h1 className="text-2xl font-semibold">
          {teacher.first_name} {teacher.last_name}
        </h1>
        <p className="text-sm text-muted-foreground">{teacher.email}</p>
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
                    {item.requiredDoc.is_mandatory ? "Required" : "Optional"}
                    {item.requiredDoc.categoryLabel
                      ? ` · ${item.requiredDoc.categoryLabel}`
                      : ""}
                    {item.expiration ? ` · Expires ${item.expiration}` : ""}
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
