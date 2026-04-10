import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { schoolService } from "@/services/schoolService";
import { analyticsService } from "@/services/analyticsService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, MapPin, Phone, Mail, Globe, Users, 
  GraduationCap, FileText, CheckCircle, AlertTriangle, 
  Clock, Settings, Calendar, Shield
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * SchoolFilePage - School profile/overview page
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

interface SchoolData {
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
}

interface Stats {
  studentCount: number;
  teacherCount: number;
  branchCount: number;
  pendingDocs: number;
  expiringDocs: number;
  compliantStudents: number;
  compliantTeachers: number;
}

export default function SchoolFilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { schoolId, canManageSchool, isParent, loading: roleLoading } = useUserRole();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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

    if (schoolId) {
      loadSchoolData();
    }
  }, [user, authLoading, roleLoading, canManageSchool, isParent, schoolId, navigate]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  // Don't render if not authorized
  if (!user || isParent || !canManageSchool) {
    return <LoadingSpinner />;
  }

  const loadSchoolData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [schoolData, dashboardData] = await Promise.all([
        schoolService.getById(schoolId),
        analyticsService.getDashboard(schoolId),
      ]);

      setSchool(schoolData);

      const dashboard = dashboardData || {};
      setStats({
        studentCount: dashboard.studentCount || 0,
        teacherCount: dashboard.teacherCount || 0,
        branchCount: dashboard.branchCount || 0,
        pendingDocs: dashboard.pendingDocs || 0,
        expiringDocs: dashboard.expiringDocs || 0,
        compliantStudents: dashboard.compliantStudents || 0,
        compliantTeachers: dashboard.compliantTeachers || 0,
      });
    } catch (error) {
      console.error("Error loading school data:", error);
      toast.error("Failed to load school information");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-8 pt-24 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No School Found</h2>
              <p className="text-muted-foreground mb-4">
                You're not associated with a school yet.
              </p>
              <Button onClick={() => navigate("/school-register")}>
                Register Your School
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const studentComplianceRate = stats && stats.studentCount > 0 
    ? Math.round((stats.compliantStudents / stats.studentCount) * 100) 
    : 100;
  const teacherComplianceRate = stats && stats.teacherCount > 0 
    ? Math.round((stats.compliantTeachers / stats.teacherCount) * 100) 
    : 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container px-4 py-8 pt-24">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
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
            <Button onClick={() => navigate("/school/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/school-dashboard")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.studentCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.compliantStudents || 0} compliant ({studentComplianceRate}%)
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/school/teacher-compliance")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.teacherCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.compliantTeachers || 0} compliant ({teacherComplianceRate}%)
                </p>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${stats?.pendingDocs ? "border-yellow-200" : ""}`} onClick={() => navigate("/school/pending-documents")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className={`h-4 w-4 ${stats?.pendingDocs ? "text-yellow-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats?.pendingDocs ? "text-yellow-600" : ""}`}>
                  {stats?.pendingDocs || 0}
                </div>
                <p className="text-xs text-muted-foreground">Documents awaiting review</p>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${stats?.expiringDocs ? "border-red-200" : ""}`} onClick={() => navigate("/school/expiring-documents")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${stats?.expiringDocs ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats?.expiringDocs ? "text-red-600" : ""}`}>
                  {stats?.expiringDocs || 0}
                </div>
                <p className="text-xs text-muted-foreground">Within 60 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* School Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  School Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
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
                        <a href={school.website} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline">
                          {school.website}
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Registered</p>
                      <p className="font-medium text-sm">{format(new Date(school.created_at), "MMMM d, yyyy")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacity & Programs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Capacity & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
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
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Locations</p>
                      <p className="font-medium text-sm">{stats?.branchCount || 1} branch{(stats?.branchCount || 1) !== 1 ? "es" : ""}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and management features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-3">
                <Button variant="outline" className="justify-start" onClick={() => navigate("/school/pending-documents")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Review Documents
                  {(stats?.pendingDocs || 0) > 0 && (
                    <Badge variant="destructive" className="ml-auto">{stats?.pendingDocs}</Badge>
                  )}
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate("/admin/required-documents")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Student Requirements
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate("/admin/staff-requirements")}>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Staff Requirements
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate("/school/branches")}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Locations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}