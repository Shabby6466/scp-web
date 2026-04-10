import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { userService } from "@/services/userService";
import { studentParentService } from "@/services/studentParentService";
import { documentService } from "@/services/documentService";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Mail, Phone, Users, School, FileText, Save, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

function normalizeDocStatus(s: string) {
  return String(s || "").toLowerCase();
}

function mapApiDocument(d: any) {
  return {
    id: d.id,
    file_name: d.fileName,
    created_at: d.createdAt,
    status: normalizeDocStatus(d.status),
    ownerUserId: d.ownerUserId,
    student_id: d.ownerUserId,
  };
}

type StudentSummary = {
  id: string;
  first_name: string;
  last_name: string;
  school: { name: string } | null;
  documents: ReturnType<typeof mapApiDocument>[];
};

export default function ParentProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isParent, getDashboardPath } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });
  const [email, setEmail] = useState("");
  const [memberSince, setMemberSince] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const detail = await userService.getDetail(user.id);
      setFormData({
        full_name: detail.name || "",
        phone: detail.phone || "",
      });
      setEmail(detail.email || "");
      setMemberSince(detail.createdAt || null);

      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];

      const summaries: StudentSummary[] = [];
      for (const link of list) {
        const s = (link as any).student;
        if (!s?.id) continue;
        const sp = s.studentProfile;
        const docsRaw = await documentService.listByOwner(s.id).catch(() => []);
        const docs = (Array.isArray(docsRaw) ? docsRaw : []).map(mapApiDocument);
        let school: { name: string } | null = null;
        if (s.schoolId) {
          try {
            const d = await userService.getDetail(s.id);
            if (d.school?.name) school = { name: d.school.name };
          } catch {
            /* keep null */
          }
        }
        summaries.push({
          id: s.id,
          first_name: sp?.firstName ?? "",
          last_name: sp?.lastName ?? "",
          school,
          documents: docs,
        });
      }

      setStudents(summaries);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
    loadProfileData();
  }, [user, authLoading, roleLoading, isParent, getDashboardPath, navigate, loadProfileData]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await userService.update(user.id, {
        name: formData.full_name,
        phone: formData.phone?.trim() ? formData.phone.trim() : "",
      });
      setEditMode(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getDocStats = (student: StudentSummary) => {
    const docs = student.documents || [];
    return {
      total: docs.length,
      approved: docs.filter((d) => d.status === "approved").length,
      pending: docs.filter((d) => d.status === "pending").length,
      rejected: docs.filter((d) => d.status === "rejected").length,
    };
  };

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
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
              <h1 className="text-3xl font-display font-bold">My Profile</h1>
              <p className="text-muted-foreground">Manage your account information</p>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>Your personal details and contact information</CardDescription>
              </div>
              {!editMode && (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      type="tel"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{formData.full_name || user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{formData.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {memberSince ? format(new Date(memberSince), "MMMM d, yyyy") : "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Children
              </CardTitle>
              <CardDescription>
                {students.length} {students.length === 1 ? "child" : "children"} registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Children Added</h3>
                  <p className="text-muted-foreground text-sm mb-4">Add your first child to get started with document uploads.</p>
                  <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => {
                    const stats = getDocStats(student);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/child/${student.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {(student.first_name || "?").charAt(0)}
                              {(student.last_name || "").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {student.first_name} {student.last_name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {student.school ? (
                                <>
                                  <School className="h-3 w-3" />
                                  <span>{student.school.name}</span>
                                </>
                              ) : (
                                <span className="text-amber-600">No school assigned</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{stats.total} documents</span>
                            </div>
                            {stats.approved > 0 && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                {stats.approved} approved
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            View File
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.flatMap((s) => s.documents || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {students
                    .flatMap((s) => (s.documents || []).map((d) => ({ ...d, studentName: `${s.first_name} ${s.last_name}` })))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5)
                    .map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.studentName} · {format(new Date(doc.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge
                          variant={
                            doc.status === "approved" ? "default" : doc.status === "rejected" ? "destructive" : "secondary"
                          }
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
