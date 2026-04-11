import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api, unwrapList } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { PageContainer } from "@/components/ui/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedStatCard } from "@/components/ui/animated-stat-card";
import { PageTransition } from "@/components/ui/animations";
import { 
  Users, 
  Briefcase, 
  Brain, 
  GraduationCap,
  Award,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Grid3X3,
  Sparkles,
} from "lucide-react";
import { EligibilityStaffList } from "@/components/eligibility/EligibilityStaffList";
import { PositionSetup } from "@/components/eligibility/PositionSetup";
import { EligibilityMatrix } from "@/components/eligibility/EligibilityMatrix";

interface OverviewStats {
  totalStaff: number;
  withProfiles: number;
  analyzedCount: number;
  positionsCount: number;
  assignedCount: number;
  gapsCount: number;
}

export default function EligibilityPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { schoolId, branchId, isDirector } = useUserRole();
  const { toast } = useToast();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const activeTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    if (schoolId) {
      fetchOverviewStats();
    }
  }, [schoolId, branchId]);

  const fetchOverviewStats = async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);

      const [teachersRes, profilesRes, positionsRes] = await Promise.all([
        api
          .get(
            `/schools/${schoolId}/users?role=TEACHER${isDirector && branchId ? `&branchId=${branchId}` : ''}&limit=500`,
          )
          .then(unwrapList),
        api.get(`/eligibility-profiles?schoolId=${schoolId}`),
        api.get(`/teacher-positions?schoolId=${schoolId}&isActive=true`),
      ]);

      const teachers = Array.isArray(teachersRes) ? teachersRes : [];
      const profiles = Array.isArray(profilesRes) ? profilesRes : [];
      const positions = Array.isArray(positionsRes) ? positionsRes : [];

      const totalStaff = teachers.length;
      const withProfiles = profiles.length;
      const analyzedCount = profiles.filter((p: any) => p.ai_analysis != null).length;
      const positionsCount = positions.length;
      const assignedCount = teachers.filter((t: any) => t.position_id != null).length;

      setStats({
        totalStaff,
        withProfiles,
        analyzedCount,
        positionsCount,
        assignedCount,
        gapsCount: totalStaff - withProfiles,
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      toast({
        title: "Error",
        description: "Failed to load overview statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      );
    }

    return (
      <PageTransition>
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedStatCard
              value={stats?.totalStaff || 0}
              label="Total Staff"
              icon={Users}
              delay={0}
            />
            <AnimatedStatCard
              value={stats?.withProfiles || 0}
              label="Profiles Complete"
              icon={CheckCircle2}
              iconColor="text-emerald-500"
              trend={stats && stats.totalStaff > 0 
                ? { value: Math.round((stats.withProfiles / stats.totalStaff) * 100), isPositive: true }
                : undefined
              }
              delay={100}
            />
            <AnimatedStatCard
              value={stats?.analyzedCount || 0}
              label="AI Analyzed"
              icon={Brain}
              iconColor="text-violet-500"
              delay={200}
            />
            <AnimatedStatCard
              value={stats?.positionsCount || 0}
              label="Positions Defined"
              icon={Briefcase}
              iconColor="text-amber-500"
              delay={300}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              variant="interactive"
              onClick={() => handleTabChange('staff')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Staff Eligibility</CardTitle>
                      <CardDescription>View and manage staff qualifications</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Badge variant="secondary">{stats?.withProfiles || 0} profiles</Badge>
                  {stats && stats.gapsCount > 0 && (
                    <Badge variant="warning-dot">
                      {stats.gapsCount} incomplete
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card 
              variant="interactive"
              onClick={() => handleTabChange('positions')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 ring-1 ring-amber-500/20">
                      <Award className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Position Setup</CardTitle>
                      <CardDescription>Define roles and requirements</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Badge variant="secondary">{stats?.positionsCount || 0} positions</Badge>
                  <Badge variant="outline">{stats?.assignedCount || 0} staff assigned</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Matrix Quick Access */}
          <Card 
            variant="interactive"
            onClick={() => handleTabChange('matrix')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/10 ring-1 ring-violet-500/20">
                    <Grid3X3 className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium">Eligibility Matrix</p>
                    <p className="text-sm text-muted-foreground">
                      See all staff eligibility for all positions at a glance
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Action Required Alert */}
          {stats && stats.gapsCount > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Action Required</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {stats.gapsCount} staff {stats.gapsCount === 1 ? 'member needs their' : 'members need their'} eligibility profile completed. 
                      Add qualifications and run AI analysis for accurate position matching.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabChange('staff');
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Complete Profiles
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageTransition>
    );
  };

  return (
    <PageContainer
      title="Teacher Eligibility"
      description="Manage staff qualifications and role assignments with AI-powered analysis"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <GraduationCap className="h-4 w-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Briefcase className="h-4 w-4" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Grid3X3 className="h-4 w-4" />
            Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="staff">
          <PageTransition>
            <EligibilityStaffList schoolId={schoolId} branchId={isDirector ? branchId : null} />
          </PageTransition>
        </TabsContent>

        <TabsContent value="positions">
          <PageTransition>
            <PositionSetup schoolId={schoolId} />
          </PageTransition>
        </TabsContent>

        <TabsContent value="matrix">
          <PageTransition>
            <EligibilityMatrix schoolId={schoolId} branchId={isDirector ? branchId : null} />
          </PageTransition>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
