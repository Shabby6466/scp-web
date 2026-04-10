import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceFramework } from '@/hooks/useComplianceFramework';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedStatCard } from '@/components/ui/animated-stat-card';
import { StaggeredGrid, PageTransition } from '@/components/ui/animations';
import { 
  Shield, 
  Flame, 
  Building2, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import InspectionTypeCard from '@/components/compliance/InspectionTypeCard';
import RequirementsList from '@/components/compliance/RequirementsList';
import CreateInspectionTypeDialog from '@/components/compliance/CreateInspectionTypeDialog';
import CreateRequirementDialog from '@/components/compliance/CreateRequirementDialog';

const ComplianceDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading: roleLoading, canManageSchool, schoolId } = useUserRole();
  const { 
    inspectionTypes, 
    requirements, 
    stats, 
    loading, 
    refresh 
  } = useComplianceFramework(schoolId);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showCreateType, setShowCreateType] = useState(false);
  const [showCreateReq, setShowCreateReq] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !canManageSchool) {
      navigate('/not-authorized');
    }
  }, [roleLoading, canManageSchool, navigate]);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getInspectionIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('doh') || lower.includes('health')) return Shield;
    if (lower.includes('fire')) return Flame;
    if (lower.includes('building') || lower.includes('facility')) return Building2;
    return FileText;
  };

  const getInspectionColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('doh') || lower.includes('health')) return 'text-info bg-info-light';
    if (lower.includes('fire')) return 'text-warning bg-warning-light';
    if (lower.includes('building') || lower.includes('facility')) return 'text-primary bg-primary/10';
    return 'text-muted-foreground bg-muted';
  };

  const totalStats = stats.reduce(
    (acc, s) => ({
      total: acc.total + s.total_requirements,
      complete: acc.complete + s.completed_count,
      overdue: acc.overdue + s.overdue_count,
      due30: acc.due30 + s.due_30_days,
    }),
    { total: 0, complete: 0, overdue: 0, due30: 0 }
  );

  const overallReadiness = totalStats.total > 0 
    ? Math.round((totalStats.complete / totalStats.total) * 100) 
    : 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="container-wide py-8">
          {/* Page Header - Premium styling */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Compliance Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Track inspections, manage requirements, and maintain compliance readiness
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowCreateType(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Inspection Type
              </Button>
            </div>
          </div>

          {/* Premium Stat Cards with animations */}
          <StaggeredGrid className="grid-cols-2 md:grid-cols-4 gap-4 mb-8" staggerDelay={75}>
            <AnimatedStatCard
              value={overallReadiness}
              suffix="%"
              label="Overall Readiness"
              icon={CheckCircle2}
              iconColor="text-primary"
              iconBg="bg-primary/10"
            />
            <AnimatedStatCard
              value={totalStats.complete}
              label="Complete"
              icon={CheckCircle2}
              iconColor="text-success"
              iconBg="bg-success-light"
              delay={75}
            />
            <AnimatedStatCard
              value={totalStats.overdue}
              label="Overdue"
              icon={AlertTriangle}
              iconColor="text-error"
              iconBg="bg-error-light"
              delay={150}
            />
            <AnimatedStatCard
              value={totalStats.due30}
              label="Due in 30 Days"
              icon={Clock}
              iconColor="text-warning"
              iconBg="bg-warning-light"
              delay={225}
            />
          </StaggeredGrid>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Overview
              </TabsTrigger>
              {inspectionTypes.map((type) => (
                <TabsTrigger 
                  key={type.id} 
                  value={type.id}
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {type.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {inspectionTypes.length === 0 ? (
                <Card variant="elevated" className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Inspection Types Yet</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-sm">
                      Start by adding your first inspection type (e.g., NYC DOH, Fire Safety)
                    </p>
                    <Button onClick={() => setShowCreateType(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Inspection Type
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <StaggeredGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stats.map((stat) => {
                    const type = inspectionTypes.find(t => t.id === stat.inspection_type_id);
                    if (!type) return null;
                    const Icon = getInspectionIcon(type.name);
                    const colorClass = getInspectionColor(type.name);

                    return (
                      <InspectionTypeCard
                        key={stat.inspection_type_id}
                        type={type}
                        stats={stat}
                        icon={Icon}
                        colorClass={colorClass}
                        onClick={() => setActiveTab(type.id)}
                      />
                    );
                  })}
                </StaggeredGrid>
              )}
            </TabsContent>

            {inspectionTypes.map((type) => (
              <TabsContent key={type.id} value={type.id} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{type.name}</h2>
                    {type.description && (
                      <p className="text-muted-foreground">{type.description}</p>
                    )}
                  </div>
                  <Button onClick={() => {
                    setSelectedTypeId(type.id);
                    setShowCreateReq(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Requirement
                  </Button>
                </div>

                <RequirementsList
                  requirements={requirements.filter(r => r.inspection_type_id === type.id)}
                  onRefresh={refresh}
                />
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </PageTransition>
      <Footer />

      <CreateInspectionTypeDialog
        open={showCreateType}
        onOpenChange={setShowCreateType}
        onSuccess={refresh}
      />

      <CreateRequirementDialog
        open={showCreateReq}
        onOpenChange={setShowCreateReq}
        inspectionTypeId={selectedTypeId}
        inspectionTypes={inspectionTypes}
        onSuccess={refresh}
      />
    </div>
  );
};

export default ComplianceDashboard;
