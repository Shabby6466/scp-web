import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { studentProfileService } from "@/services/studentProfileService";
import { documentTypeService } from "@/services/documentTypeService";
import { documentService } from "@/services/documentService";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DocumentUploadDialog from "@/components/DocumentUploadDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  School,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInYears } from "date-fns";

/**
 * ChildFilePage - Parent-only child profile/documents page
 */

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  school_id: string | null;
  grade_level: string | null;
  parent_id: string;
  branch_id: string | null;
  school_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: null;
  deleted_by: null;
};

type DocumentRow = {
  id: string;
  ownerUserId: string;
  student_id: string;
  file_name: string;
  created_at: string;
  category: string;
  status: string;
  expiration_date?: string | null;
  rejection_reason?: string | null;
  documentTypeId?: string;
};

type RequiredDocument = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
};

type ChecklistItem = {
  requiredDoc: RequiredDocument;
  status: "missing" | "pending" | "approved" | "rejected" | "expired";
  document?: DocumentRow;
};

function slugCategory(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeStatus(s: string) {
  return String(s || "").toLowerCase();
}

function mapApiDocument(d: any, profileId: string): DocumentRow {
  const cat =
    d.documentType?.category ||
    (d.documentType?.name ? slugCategory(d.documentType.name) : "");
  return {
    id: d.id,
    ownerUserId: d.ownerUserId,
    student_id: d.studentProfileId ?? profileId,
    file_name: d.fileName,
    created_at: d.createdAt,
    category: cat,
    status: normalizeStatus(d.status),
    expiration_date: d.expiresAt,
    rejection_reason: d.rejectionReason,
    documentTypeId: d.documentTypeId,
  };
}

function profileToStudentRow(profile: any, parentId: string): StudentRow {
  const dob = profile?.dateOfBirth
    ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
    : "";
  return {
    id: profile.id,
    first_name: profile?.firstName ?? "",
    last_name: profile?.lastName ?? "",
    date_of_birth: dob,
    school_id: profile.schoolId ?? profile.branch?.schoolId ?? null,
    grade_level: profile?.gradeLevel ?? null,
    parent_id: parentId,
    branch_id: profile.branchId ?? null,
    school_name: profile.school?.name ?? null,
    created_at: profile.createdAt ?? "",
    updated_at: profile.updatedAt ?? "",
    deleted_at: null,
    deleted_by: null,
  };
}

export default function ChildFilePage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isParent, getDashboardPath } = useUserRole();
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [school, setSchool] = useState<{ name: string; address: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChildData = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const detail = (await studentProfileService.getById(id)) as any;
        if (!detail?.id) {
          toast.error("Child not found or access denied");
          navigate("/dashboard");
          return;
        }

        const studentRow = profileToStudentRow(detail, user.id);
        setStudent(studentRow);

        if (detail.school) {
          const a = detail.school;
          setSchool({
            name: a.name,
            address: [a.address, a.city, a.state].filter(Boolean).join(", "),
          });
        } else {
          setSchool(null);
        }

        const docsRaw = await documentService.listByOwner(id);
        const docs = (Array.isArray(docsRaw) ? docsRaw : []).map((d) =>
          mapApiDocument(d, id),
        );
        setDocuments(docs);

        const schoolId = detail.schoolId ?? detail.branch?.schoolId ?? null;
        let reqTypes: any[] = [];
        if (schoolId) {
          try {
            const types = await documentTypeService.list({
              schoolId,
              targetRole: "STUDENT",
            });
            reqTypes = Array.isArray(types) ? types : [];
          } catch {
            reqTypes = [];
          }
        }
        const requiredDocs: RequiredDocument[] = reqTypes
          .filter((dt) => dt.isActive !== false)
          .map((dt) => ({
            id: dt.id,
            category: dt.category || slugCategory(dt.name),
            name: dt.name,
            description: dt.description ?? null,
            is_mandatory: dt.isMandatory !== false,
          }));

        const list = buildChecklist(requiredDocs, docs);
        setChecklist(list);
      } catch (error) {
        console.error("Error loading child data:", error);
        toast.error("Failed to load child information");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    },
    [navigate, user?.id],
  );

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isParent) {
      navigate(getDashboardPath(), { replace: true });
      return;
    }

    if (childId) {
      loadChildData(childId);
    }
  }, [childId, user, authLoading, roleLoading, isParent, getDashboardPath, navigate, loadChildData]);

  const buildChecklist = (requiredDocs: RequiredDocument[], docs: DocumentRow[]): ChecklistItem[] => {
    return requiredDocs.map((rd) => {
      const match =
        docs.find((d) => d.documentTypeId === rd.id) ||
        docs.find((d) => d.category === rd.category);
      if (!match) {
        return { requiredDoc: rd, status: "missing" as const };
      }

      if (match.expiration_date && new Date(match.expiration_date) < new Date()) {
        return { requiredDoc: rd, status: "expired" as const, document: match };
      }

      return {
        requiredDoc: rd,
        status: match.status as ChecklistItem["status"],
        document: match,
      };
    });
  };

  const getStatusIcon = (status: ChecklistItem["status"]) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "expired":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ChecklistItem["status"]) => {
    const variants: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      missing: { variant: "outline", label: "Missing" },
      pending: { variant: "secondary", label: "Pending Review" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      expired: { variant: "destructive", label: "Expired" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleRefresh = () => {
    if (childId) loadChildData(childId);
  };

  const completedCount = checklist.filter((c) => c.status === "approved").length;
  const totalRequired = checklist.filter((c) => c.requiredDoc.is_mandatory).length;

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !isParent) {
    return <LoadingSpinner />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-8 pt-24">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-8 pt-24 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Child Not Found</h2>
              <p className="text-muted-foreground mb-4">This child record could not be found or you don't have access.</p>
              <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const studentForDialog: StudentRow[] = [student];
  const age = student.date_of_birth
    ? differenceInYears(new Date(), new Date(student.date_of_birth))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-display font-bold">
                {student.first_name} {student.last_name}
              </h1>
              <p className="text-muted-foreground">Child Profile & Documents</p>
            </div>
            <DocumentUploadDialog students={studentForDialog} onDocumentUploaded={handleRefresh}>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DocumentUploadDialog>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">
                    {student.first_name} {student.last_name}
                  </span>
                </div>
                {student.date_of_birth && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="font-medium">{format(new Date(student.date_of_birth), "MMMM d, yyyy")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age</span>
                  <span className="font-medium">{age} years old</span>
                </div>
                {student.grade_level && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grade Level</span>
                    <span className="font-medium">{student.grade_level}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  School Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {school ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">School</span>
                      <span className="font-medium">{school.name}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm text-muted-foreground">{school.address}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <School className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No school assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {checklist.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Document Completion</h3>
                    <p className="text-sm text-muted-foreground">
                      {completedCount} of {totalRequired} required documents approved
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">
                      {totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Documents Checklist
              </CardTitle>
              <CardDescription>
                {checklist.length > 0
                  ? "Upload or replace documents to complete your child's file"
                  : school
                    ? "No required document types are assigned for this student yet"
                    : "Your child needs to be assigned to a school first"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checklist.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Requirements Yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    {school
                      ? "Required document types will appear here once assigned by the school."
                      : "Once your child is enrolled at a school, you'll see the required documents here."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item.requiredDoc.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        item.status === "approved"
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                          : item.status === "rejected" || item.status === "expired"
                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                            : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="font-medium">{item.requiredDoc.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.requiredDoc.is_mandatory ? "Required" : "Optional"}
                            {item.document?.expiration_date && (
                              <> · Expires {format(new Date(item.document.expiration_date), "MMM d, yyyy")}</>
                            )}
                          </div>
                          {item.document?.rejection_reason && (
                            <p className="text-xs text-red-600 mt-1">Reason: {item.document.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                        <DocumentUploadDialog students={studentForDialog} onDocumentUploaded={handleRefresh}>
                          <Button size="sm" variant={item.status === "missing" ? "default" : "outline"}>
                            {item.status === "missing" ? "Upload" : "Replace"}
                          </Button>
                        </DocumentUploadDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Document History</CardTitle>
                <CardDescription>All documents uploaded for {student.first_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), "MMM d, yyyy")} · {doc.category.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          doc.status === "approved"
                            ? "default"
                            : doc.status === "rejected"
                              ? "destructive"
                              : doc.status === "expired"
                                ? "destructive"
                                : "secondary"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
