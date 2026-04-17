import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useComplianceData } from "@/hooks/useComplianceData";
import { COMPLIANCE_CATEGORY_SLUG } from "@/constants/complianceCategories";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ComplianceOverview } from "@/components/compliance/ComplianceOverview";
import { ExpiringSoonList } from "@/components/compliance/ExpiringSoonList";
import { ExpiredDocumentsList } from "@/components/compliance/ExpiredDocumentsList";
import { StudentComplianceBreakdown } from "@/components/compliance/StudentComplianceBreakdown";
import { TeacherComplianceBreakdown } from "@/components/compliance/TeacherComplianceBreakdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Shield } from "lucide-react";

const DOHCompliance = () => {
  const { user } = useAuth();
  const { isAdmin, canManageSchool, schoolId, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !canManageSchool) {
      navigate("/");
    }
  }, [canManageSchool, roleLoading, navigate]);

  const effectiveSchoolId = isAdmin ? undefined : (schoolId ?? undefined);
  const { stats, loading: statsLoading } = useComplianceData(
    effectiveSchoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.DOH,
  );
  const { expiringDocs, expiredDocs, loading: listsLoading, refresh } =
    useComplianceData(effectiveSchoolId);
  const loading = statsLoading || listsLoading;

  if (roleLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container px-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-display font-bold mb-2 flex items-center gap-3">
                <Shield className="h-10 w-10 text-primary" />
                DOH Compliance Dashboard
              </h1>
              <p className="text-muted-foreground">
                Monitor document compliance status for students and staff
              </p>
            </div>
            <Button onClick={refresh} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Overview Stats */}
          <div className="mb-8">
            <ComplianceOverview stats={stats} loading={loading} />
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="expiring" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
            </TabsList>

            <TabsContent value="expiring">
              <ExpiringSoonList documents={expiringDocs} loading={loading} />
            </TabsContent>

            <TabsContent value="expired">
              <ExpiredDocumentsList 
                documents={expiredDocs} 
                loading={loading} 
                isAdmin={isAdmin} 
              />
            </TabsContent>

            <TabsContent value="students">
              <StudentComplianceBreakdown schoolId={effectiveSchoolId} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="teachers">
              <TeacherComplianceBreakdown schoolId={effectiveSchoolId} isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DOHCompliance;
