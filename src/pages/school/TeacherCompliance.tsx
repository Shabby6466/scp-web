import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import { documentTypeService } from "@/services/documentTypeService";
import { documentService } from "@/services/documentService";
import { unwrapList } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Search, Upload, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BulkTeacherDocumentUpload from "@/components/admin/BulkTeacherDocumentUpload";

/**
 * TeacherCompliance - Teacher compliance tracking page
 * 
 * SCHOOL-ONLY PAGE: Only role='school', 'school_staff', 'admin', or 'director' can access.
 * Parents are redirected to their dashboard.
 */

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status: string;
  certification_expiry: string | null;
  background_check_expiry: string | null;
}

interface RequiredDocument {
  id: string;
  name: string;
  category: string;
  is_mandatory: boolean;
  description: string | null;
}

interface TeacherDocument {
  id: string;
  teacher_id: string;
  /** Stable match key for required doc rows */
  document_type_id: string;
  document_type: string;
  expiration_date: string | null;
  file_name: string;
  created_at: string;
}

function normalizeTeacherSearchDoc(d: Record<string, unknown>): TeacherDocument {
  const docType = d.documentType as Record<string, unknown> | undefined;
  const typeId = String(d.documentTypeId ?? docType?.id ?? "");
  const expRaw = d.expiresAt ?? d.expiration_date;
  const expStr =
    expRaw != null && String(expRaw) !== ""
      ? new Date(expRaw as string).toISOString().slice(0, 10)
      : null;
  return {
    id: String(d.id),
    teacher_id: String(d.ownerUserId ?? ""),
    document_type_id: typeId,
    document_type: String(docType?.name ?? ""),
    expiration_date: expStr,
    file_name: String(d.fileName ?? ""),
    created_at: String(d.createdAt ?? ""),
  };
}

function mapRequiredTeacherTypesFromApi(raw: unknown[]): RequiredDocument[] {
  return raw.map((r: any) => ({
    id: String(r.id),
    name: String(r.name ?? "Document"),
    category:
      typeof r.category === "object" && r.category?.name
        ? String(r.category.name)
        : String(r.category ?? ""),
    is_mandatory: !!(r.isMandatory ?? r.is_mandatory),
    description: r.description != null ? String(r.description) : null,
  }));
}

interface TeacherCompliance {
  teacher: Teacher;
  requiredDocs: RequiredDocument[];
  uploadedDocs: TeacherDocument[];
  missingCount: number;
  expiredCount: number;
  expiringCount: number;
  compliantCount: number;
}

const TeacherCompliance = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [teacherDocs, setTeacherDocs] = useState<TeacherDocument[]>([]);
  const [compliance, setCompliance] = useState<TeacherCompliance[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Role-based access control
  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Not authenticated - redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // Parents should not see this page - redirect to parent dashboard
    if (isParent) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Only school-related roles can access
    if (!canManageSchool) {
      navigate('/not-authorized', { replace: true });
      return;
    }

    if (!schoolId) return;
    fetchData();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate, schoolId]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  // Don't render if not authorized
  if (!user || isParent || !canManageSchool) {
    return <LoadingSpinner />;
  }

  const fetchData = async () => {
    if (!schoolId) return;

    try {
      setLoading(true);

      const [teachersData, requiredRaw, docsRaw] = await Promise.all([
        userService.listTeachers(schoolId),
        documentTypeService.list({ schoolId, targetRole: 'TEACHER' }),
        documentService.search({ schoolId, ownerRole: 'TEACHER' }),
      ]);

      const requiredList = mapRequiredTeacherTypesFromApi(unwrapList(requiredRaw));
      const docsList = unwrapList<Record<string, unknown>>(docsRaw).map((d) =>
        normalizeTeacherSearchDoc(d),
      );

      setTeachers(teachersData || []);
      setRequiredDocs(requiredList);
      setTeacherDocs(docsList);

      calculateCompliance(teachersData || [], requiredList, docsList);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load teacher compliance data");
    } finally {
      setLoading(false);
    }
  };

  const calculateCompliance = (
    teachers: Teacher[],
    required: RequiredDocument[],
    docs: TeacherDocument[]
  ) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const complianceData: TeacherCompliance[] = teachers.map((teacher) => {
      const teacherDocs = docs.filter((d) => d.teacher_id === teacher.id);
      
      let missingCount = 0;
      let expiredCount = 0;
      let expiringCount = 0;
      let compliantCount = 0;

      required.forEach((req) => {
        const uploaded = teacherDocs.find(
          (d) =>
            d.teacher_id === teacher.id &&
            d.document_type_id !== "" &&
            d.document_type_id === req.id,
        );

        if (!uploaded) {
          missingCount++;
        } else if (uploaded.expiration_date) {
          const expirationDate = new Date(uploaded.expiration_date);
          if (expirationDate < today) {
            expiredCount++;
          } else if (expirationDate <= thirtyDaysFromNow) {
            expiringCount++;
          } else {
            compliantCount++;
          }
        } else {
          compliantCount++;
        }
      });

      // Check teacher certification and background check expiry
      if (teacher.certification_expiry) {
        const certExpiry = new Date(teacher.certification_expiry);
        if (certExpiry < today) expiredCount++;
        else if (certExpiry <= thirtyDaysFromNow) expiringCount++;
      }

      if (teacher.background_check_expiry) {
        const bgExpiry = new Date(teacher.background_check_expiry);
        if (bgExpiry < today) expiredCount++;
        else if (bgExpiry <= thirtyDaysFromNow) expiringCount++;
      }

      return {
        teacher,
        requiredDocs: required,
        uploadedDocs: teacherDocs,
        missingCount,
        expiredCount,
        expiringCount,
        compliantCount,
      };
    });

    setCompliance(complianceData);
  };

  const filteredCompliance = compliance.filter((c) =>
    `${c.teacher.first_name} ${c.teacher.last_name} ${c.teacher.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const totalStats = {
    totalTeachers: compliance.length,
    fullyCompliant: compliance.filter(
      (c) => c.missingCount === 0 && c.expiredCount === 0 && c.expiringCount === 0
    ).length,
    totalMissing: compliance.reduce((sum, c) => sum + c.missingCount, 0),
    totalExpired: compliance.reduce((sum, c) => sum + c.expiredCount, 0),
    totalExpiring: compliance.reduce((sum, c) => sum + c.expiringCount, 0),
  };

  const complianceRate =
    totalStats.totalTeachers > 0
      ? Math.round((totalStats.fullyCompliant / totalStats.totalTeachers) * 100)
      : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Teacher Compliance</h1>
        </div>
        <div className="text-center py-12">Loading compliance data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Teacher Compliance Dashboard</h1>
            <p className="text-muted-foreground">Track staff document requirements and status</p>
          </div>
        </div>
        <Button onClick={() => setShowBulkUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{complianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.fullyCompliant} of {totalStats.totalTeachers} compliant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStats.fullyCompliant}</div>
            <p className="text-xs text-muted-foreground">All documents current</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-500" />
              Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStats.totalMissing}</div>
            <p className="text-xs text-muted-foreground">Documents not uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStats.totalExpired}</div>
            <p className="text-xs text-muted-foreground">Past expiration date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStats.totalExpiring}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teacher Compliance List */}
      <div className="space-y-4">
        {filteredCompliance.map((tc) => (
          <Card key={tc.teacher.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {tc.teacher.first_name} {tc.teacher.last_name}
                  </CardTitle>
                  <CardDescription>{tc.teacher.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {tc.missingCount === 0 && tc.expiredCount === 0 && tc.expiringCount === 0 ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Compliant
                    </Badge>
                  ) : (
                    <>
                      {tc.expiredCount > 0 && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {tc.expiredCount} Expired
                        </Badge>
                      )}
                      {tc.expiringCount > 0 && (
                        <Badge className="bg-yellow-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {tc.expiringCount} Expiring
                        </Badge>
                      )}
                      {tc.missingCount > 0 && (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          {tc.missingCount} Missing
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="required" className="w-full">
                <TabsList>
                  <TabsTrigger value="required">Required Documents</TabsTrigger>
                  <TabsTrigger value="uploaded">Uploaded Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="required" className="space-y-2">
                  {tc.requiredDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No required documents configured</p>
                  ) : (
                    tc.requiredDocs.map((req) => {
                      const uploaded = tc.uploadedDocs.find(
                        (d) =>
                          d.teacher_id === tc.teacher.id &&
                          d.document_type_id !== "" &&
                          d.document_type_id === req.id,
                      );
                      const today = new Date();
                      let status: "missing" | "expired" | "expiring" | "current" = "missing";

                      if (uploaded) {
                        if (uploaded.expiration_date) {
                          const expDate = new Date(uploaded.expiration_date);
                          if (expDate < today) status = "expired";
                          else if (expDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))
                            status = "expiring";
                          else status = "current";
                        } else {
                          status = "current";
                        }
                      }

                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{req.name}</p>
                            {req.description && (
                              <p className="text-sm text-muted-foreground">{req.description}</p>
                            )}
                            <Badge variant="outline" className="mt-1">{req.category}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === "missing" && (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Missing
                              </Badge>
                            )}
                            {status === "expired" && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            )}
                            {status === "expiring" && (
                              <Badge className="bg-yellow-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            )}
                            {status === "current" && (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
                <TabsContent value="uploaded" className="space-y-2">
                  {tc.uploadedDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No documents uploaded yet</p>
                  ) : (
                    tc.uploadedDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doc.document_type}</p>
                          <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                        </div>
                        <div className="text-right">
                          {doc.expiration_date && (
                            <p className="text-sm">
                              Expires: {new Date(doc.expiration_date).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/teachers/${tc.teacher.id}`)}
                >
                  View Teacher Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showBulkUpload && schoolId && (
        <BulkTeacherDocumentUpload
          schoolId={schoolId}
          teachers={teachers}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default TeacherCompliance;
