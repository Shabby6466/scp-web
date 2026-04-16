import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceFramework } from '@/hooks/useComplianceFramework';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Flame, Plus, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import InspectionTypeCard from '@/components/compliance/InspectionTypeCard';
import RequirementsList from '@/components/compliance/RequirementsList';
import CreateInspectionTypeDialog from '@/components/compliance/CreateInspectionTypeDialog';
import CreateRequirementDialog from '@/components/compliance/CreateRequirementDialog';
import { Skeleton } from '@/components/ui/skeleton';

const FacilitySafetySection = () => {
  const navigate = useNavigate();
  const { schoolId } = useUserRole();
  const {
    inspectionTypes,
    requirements,
    stats,
    loading,
    refresh,
  } = useComplianceFramework(schoolId);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [createTypeOpen, setCreateTypeOpen] = useState(false);
  const [createReqOpen, setCreateReqOpen] = useState(false);

  const facilityTypes = inspectionTypes.filter((t) => t.category === 'facility_safety');
  const facilityRequirements = requirements.filter((r) =>
    facilityTypes.some((t) => t.id === r.inspection_type_id)
  );

  const facilityStats = facilityRequirements.reduce(
    (acc, req) => {
      acc.total++;
      if (req.status === 'complete') acc.complete++;
      if (req.status === 'overdue') acc.overdue++;
      const today = new Date().toISOString().split('T')[0];
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (
        req.next_due_date &&
        req.next_due_date >= today &&
        req.next_due_date <= thirtyDays &&
        req.status !== 'complete'
      ) {
        acc.dueSoon++;
      }
      return acc;
    },
    { total: 0, complete: 0, overdue: 0, dueSoon: 0 }
  );

  const readinessScore =
    facilityStats.total > 0
      ? Math.round((facilityStats.complete / facilityStats.total) * 100)
      : 100;

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/compliance-center')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Compliance Center
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <Badge variant="secondary">Facility & Safety</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Facility & Safety Inspections
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Track Fire/Life Safety and Building/Facilities Safety inspection requirements.
            Maintain evidence binders and stay audit-ready.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Readiness Score</p>
                  <div className="text-3xl font-bold">
                    {loading ? <Skeleton className="h-8 w-16" /> : `${readinessScore}%`}
                  </div>
                </div>
                <CheckCircle className={`h-8 w-8 ${readinessScore >= 90 ? 'text-green-500' : readinessScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Complete</p>
                  <div className="text-3xl font-bold">
                    {loading ? <Skeleton className="h-8 w-16" /> : facilityStats.complete}
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={facilityStats.overdue > 0 ? 'border-red-200 dark:border-red-900' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <div className={`text-3xl font-bold ${facilityStats.overdue > 0 ? 'text-red-600' : ''}`}>
                    {loading ? <Skeleton className="h-8 w-16" /> : facilityStats.overdue}
                  </div>
                </div>
                <AlertTriangle className={`h-8 w-8 ${facilityStats.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>
          <Card className={facilityStats.dueSoon > 0 ? 'border-yellow-200 dark:border-yellow-900' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Due Soon</p>
                  <div className={`text-3xl font-bold ${facilityStats.dueSoon > 0 ? 'text-yellow-600' : ''}`}>
                    {loading ? <Skeleton className="h-8 w-16" /> : facilityStats.dueSoon}
                  </div>
                </div>
                <Clock className={`h-8 w-8 ${facilityStats.dueSoon > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="requirements">All Requirements</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateReqOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Requirement
              </Button>
              <Button onClick={() => setCreateTypeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Inspection Type
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : facilityTypes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Inspection Types</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first facility safety inspection type to start tracking requirements.
                  </p>
                  <Button onClick={() => setCreateTypeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Inspection Type
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilityTypes.map((type) => {
                  const typeStats = stats.find((s) => s.inspection_type_id === type.id) || {
                    inspection_type_id: type.id,
                    inspection_name: type.name,
                    total_requirements: 0,
                    completed_count: 0,
                    overdue_count: 0,
                    due_30_days: 0,
                    due_60_days: 0,
                    due_90_days: 0,
                    readiness_score: 100,
                  };
                  return (
                    <InspectionTypeCard
                      key={type.id}
                      type={type}
                      stats={typeStats}
                      icon={Flame}
                      colorClass="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                      onClick={() => {
                        setSelectedTypeId(type.id);
                        setActiveTab('requirements');
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requirements" className="space-y-6">
            {(() => {
              const filteredReqs = selectedTypeId 
                ? facilityRequirements.filter((r) => r.inspection_type_id === selectedTypeId)
                : facilityRequirements;
              
              if (filteredReqs.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Requirements Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        {facilityTypes.length === 0 
                          ? "Create an inspection type first, then add requirements to track."
                          : "Add your first compliance requirement to start tracking."}
                      </p>
                      {facilityTypes.length === 0 ? (
                        <Button onClick={() => setCreateTypeOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Inspection Type
                        </Button>
                      ) : (
                        <Button onClick={() => setCreateReqOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Requirement
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <RequirementsList
                  requirements={filteredReqs}
                  onRefresh={refresh}
                />
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>

      <CreateInspectionTypeDialog
        open={createTypeOpen}
        onOpenChange={setCreateTypeOpen}
        defaultCategory="facility_safety"
        lockCategory
        onSuccess={() => {
          refresh();
          setCreateTypeOpen(false);
        }}
      />

      <CreateRequirementDialog
        open={createReqOpen}
        onOpenChange={setCreateReqOpen}
        inspectionTypeId={selectedTypeId}
        inspectionTypes={facilityTypes}
        onSuccess={() => {
          refresh();
          setCreateReqOpen(false);
        }}
      />
    </>
  );
};

export default FacilitySafetySection;