import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { schoolService } from "@/services/schoolService";
import { branchService } from "@/services/branchService";
import { userService } from "@/services/userService";
import { documentService } from "@/services/documentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, MapPin, Phone, Mail, Globe, 
  Users, GraduationCap, FileText, CheckCircle, Clock,
  Calendar, Shield, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import { StudentComplianceBreakdown } from "@/components/compliance/StudentComplianceBreakdown";
import { TeacherComplianceBreakdown } from "@/components/compliance/TeacherComplianceBreakdown";
import { SchoolAdminInviteSection } from "@/components/admin/SchoolAdminInviteSection";
import TeacherInviteDialog from "@/components/admin/TeacherInviteDialog";

interface School {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  website: string | null;
  is_approved: boolean;
  total_capacity: number | null;
  min_age: number | null;
  max_age: number | null;
  created_at: string;
  license_number: string | null;
  certification_number: string | null;
  approved_at: string | null;
}

function safeFormatDate(raw: unknown, fmt: string): string {
  if (raw == null || raw === "") return "—";
  const d = raw instanceof Date ? raw : new Date(raw as string | number);
  if (!isValid(d)) return "—";
  return format(d, fmt);
}

/** Map GET /schools/:id payload (camelCase) to the shape this page uses. */
function mapSchoolFromApi(raw: unknown): School {
  const r = raw as Record<string, any>;
  const created = r.createdAt ?? r.created_at;
  const approved = r.approvedAt ?? r.approved_at;
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    address: String(r.address ?? ""),
    city: String(r.city ?? ""),
    state: String(r.state ?? ""),
    zip_code: String(r.zipCode ?? r.zip_code ?? ""),
    website: r.website != null ? String(r.website) : null,
    is_approved: !!(r.isApproved ?? r.is_approved),
    total_capacity: r.totalCapacity ?? r.total_capacity ?? null,
    min_age: r.minAge ?? r.min_age ?? null,
    max_age: r.maxAge ?? r.max_age ?? null,
    created_at: created != null ? String(created) : "",
    license_number: r.licenseNumber ?? r.license_number ?? null,
    certification_number: r.certificationNumber ?? r.certification_number ?? null,
    approved_at: approved != null && approved !== "" ? String(approved) : null,
  };
}

interface Stats {
  studentCount: number;
  teacherCount: number;
  branchCount: number;
  pendingDocs: number;
  approvedDocs: number;
}

interface Branch {
  id: string;
  branch_name: string;
  address: string;
  city: string;
  is_primary: boolean;
}

export default function SchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (schoolId) {
      loadSchoolData(schoolId);
    }
  }, [schoolId]);

  const loadSchoolData = async (id: string) => {
    setLoading(true);
    try {
      const [schoolData, studentsData, teachersData, branchesData, pendingDocsData, approvedDocsData] = await Promise.all([
        schoolService.getById(id),
        userService.listStudents(id),
        userService.listTeachers(id),
        branchService.listBySchool(id),
        documentService.search({ schoolId: id, status: 'pending' }),
        documentService.search({ schoolId: id, status: 'approved' }),
      ]);

      setSchool(mapSchoolFromApi(schoolData));

      const studentsList = Array.isArray(studentsData) ? studentsData : (studentsData as any)?.data ?? [];
      const teachersList = Array.isArray(teachersData) ? teachersData : (teachersData as any)?.data ?? [];
      const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];
      const pendingList = Array.isArray(pendingDocsData) ? pendingDocsData : (pendingDocsData as any)?.data ?? [];
      const approvedList = Array.isArray(approvedDocsData) ? approvedDocsData : (approvedDocsData as any)?.data ?? [];

      setStats({
        studentCount: studentsList.length,
        teacherCount: teachersList.length,
        branchCount: branchesList.length,
        pendingDocs: pendingList.length,
        approvedDocs: approvedList.length,
      });

      setBranches(
        branchesList.map((b: Record<string, any>) => ({
          id: String(b.id),
          branch_name: String(b.branch_name ?? b.name ?? ""),
          address: String(b.address ?? ""),
          city: String(b.city ?? ""),
          is_primary: !!(b.is_primary ?? b.isPrimary),
        })),
      );
    } catch (error) {
      console.error("Error loading school:", error);
      toast.error("Failed to load school details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!school) return;
    setApproving(true);
    try {
      await schoolService.approve(school.id);
      setSchool(prev => prev ? { ...prev, is_approved: true, approved_at: new Date().toISOString() } : null);
      toast.success("School approved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve school");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto flex w-full max-w-6xl justify-center px-4 py-12">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">School Not Found</h2>
            <Button onClick={() => navigate("/admin")}>Back to Admin</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        {/* Page title */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-bold">{school.name}</h1>
                <Badge variant={school.is_approved ? "default" : "secondary"}>
                  {school.is_approved ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Approved</>
                  ) : (
                    <><Clock className="h-3 w-3 mr-1" /> Pending</>
                  )}
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {school.address}, {school.city}, {school.state} {school.zip_code}
              </p>
            </div>
            {!school.is_approved && (
              <Button onClick={handleApprove} disabled={approving}>
                {approving ? "Approving..." : "Approve School"}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.studentCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.teacherCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Docs</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingDocs || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Branches</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.branchCount || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* School Admin Invite Section */}
          <SchoolAdminInviteSection 
            schoolId={school.id} 
            schoolName={school.name} 
            isApproved={school.is_approved} 
          />

          {/* Tabs */}
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList>
              <TabsTrigger value="info">School Info</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm">{school.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-sm">{school.phone}</p>
                      </div>
                    </div>
                    {school.website && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Website</p>
                          <p className="font-medium text-sm">{school.website}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Registered</p>
                        <p className="font-medium text-sm">{safeFormatDate(school.created_at, "MMMM d, yyyy")}</p>
                      </div>
                    </div>
                    {school.is_approved && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Approved</p>
                          <p className="font-medium text-sm">{safeFormatDate(school.approved_at, "MMMM d, yyyy")}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Capacity & Licensing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {school.total_capacity && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Total Capacity</p>
                          <p className="font-medium text-sm">{school.total_capacity} students</p>
                        </div>
                      </div>
                    )}
                    {(school.min_age !== null || school.max_age !== null) && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Age Range</p>
                          <p className="font-medium text-sm">{school.min_age || 0} - {school.max_age || 6} years</p>
                        </div>
                      </div>
                    )}
                    {school.license_number && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">License Number</p>
                          <p className="font-medium text-sm">{school.license_number}</p>
                        </div>
                      </div>
                    )}
                    {school.certification_number && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Certification Number</p>
                          <p className="font-medium text-sm">{school.certification_number}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="students">
              <StudentComplianceBreakdown schoolId={schoolId} isAdmin={true} />
            </TabsContent>

            <TabsContent value="teachers">
              <div className="flex justify-end mb-4">
                <TeacherInviteDialog schoolId={schoolId} />
              </div>
              <TeacherComplianceBreakdown schoolId={schoolId} isAdmin={true} />
            </TabsContent>

            <TabsContent value="branches">
              <Card>
                <CardHeader>
                  <CardTitle>School Branches</CardTitle>
                  <CardDescription>{branches.length} active location{branches.length !== 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                  {branches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No branches configured</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {branches.map((branch) => (
                        <div key={branch.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{branch.branch_name}</p>
                              <p className="text-sm text-muted-foreground">{branch.address}, {branch.city}</p>
                            </div>
                          </div>
                          {branch.is_primary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
    </div>
  );
}
