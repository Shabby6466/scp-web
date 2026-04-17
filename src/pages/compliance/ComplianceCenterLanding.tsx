import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { complianceService } from '@/services/complianceService';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceData } from '@/hooks/useComplianceData';
import { COMPLIANCE_CATEGORY_SLUG } from '@/constants/complianceCategories';
import { useCertifications } from '@/hooks/useCertifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Heart,
  Flame,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface InspectionStats {
  doh: { total: number; complete: number; overdue: number; dueSoon: number };
  facility: { total: number; complete: number; overdue: number; dueSoon: number };
}

const ComplianceCenterLanding = () => {
  const { schoolId, loading: roleLoading } = useUserRole();
  const { stats: dohDocStats, loading: dohDocLoading } = useComplianceData(
    schoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.DOH,
  );
  const { stats: facilityDocStats, loading: facilityDocLoading } = useComplianceData(
    schoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.FACILITY_SAFETY,
  );
  const { stats: certStats, loading: certLoading } = useCertifications(schoolId);
  const [inspectionStats, setInspectionStats] = useState<InspectionStats>({
    doh: { total: 0, complete: 0, overdue: 0, dueSoon: 0 },
    facility: { total: 0, complete: 0, overdue: 0, dueSoon: 0 },
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchInspectionStats();
    }
  }, [schoolId]);

  const fetchInspectionStats = async () => {
    if (!schoolId) return;
    setStatsLoading(true);

    try {
      const inspectionTypes = await complianceService.listInspectionTypes(schoolId);

      if (!inspectionTypes?.length) {
        setStatsLoading(false);
        return;
      }

      const dohTypeIds = inspectionTypes
        .filter((t: any) => t.category === 'doh')
        .map((t: any) => t.id);
      const facilityTypeIds = inspectionTypes
        .filter((t: any) => t.category === 'facility_safety')
        .map((t: any) => t.id);

      const requirements = await complianceService.listRequirements(schoolId);

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const calcStats = (typeIds: string[]) => {
        if (!typeIds.length) return { total: 0, complete: 0, overdue: 0, dueSoon: 0 };
        const filtered = (requirements || []).filter((r: any) => typeIds.includes(r.inspection_type_id));
        return filtered.reduce(
          (acc: any, req: any) => {
            acc.total++;
            if (req.status === 'complete') acc.complete++;
            if (req.status === 'overdue') acc.overdue++;
            if (
              req.next_due_date &&
              req.next_due_date >= today &&
              req.next_due_date <= thirtyDaysFromNow &&
              req.status !== 'complete'
            ) {
              acc.dueSoon++;
            }
            return acc;
          },
          { total: 0, complete: 0, overdue: 0, dueSoon: 0 }
        );
      };

      setInspectionStats({
        doh: calcStats(dohTypeIds),
        facility: calcStats(facilityTypeIds),
      });
    } catch (error) {
      console.error('Error fetching inspection stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const getReadinessScore = (stats: { total: number; complete: number }) => {
    if (stats.total === 0) return 100;
    return Math.round((stats.complete / stats.total) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isLoading =
    roleLoading || dohDocLoading || facilityDocLoading || certLoading || statsLoading;

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <Badge variant="secondary" className="mb-2">
            Compliance Center
          </Badge>
          <h1 className="text-3xl font-bold mb-2">
            Compliance & Safety Dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Track DOH compliance, facility safety inspections, and certifications across your
            organization. Stay audit-ready with real-time readiness scores.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Switch to DOH, facility, or certifications using the sidebar.
          </p>
        </div>

        {/* Main Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* DOH Compliance Card */}
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-100 to-transparent dark:from-red-900/20 rounded-bl-full" />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                {!isLoading && inspectionStats.doh.overdue > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {inspectionStats.doh.overdue} Overdue
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">DOH Compliance</CardTitle>
              <CardDescription>Students & Staff Health Requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-24" />
                </>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <span
                      className={`text-3xl font-bold ${getScoreColor(
                        dohDocStats?.student_compliance_rate || 0
                      )}`}
                    >
                      {Math.round(dohDocStats?.student_compliance_rate || 0)}%
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">
                      Student Compliance
                    </span>
                  </div>
                  <Progress
                    value={dohDocStats?.student_compliance_rate || 0}
                    className="h-2"
                  />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {dohDocStats?.compliant_students || 0}/
                        {dohDocStats?.total_students || 0} Students
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {dohDocStats?.compliant_teachers || 0}/
                        {dohDocStats?.total_teachers || 0} Teachers
                      </span>
                    </div>
                  </div>
                  {inspectionStats.doh.dueSoon > 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span>{inspectionStats.doh.dueSoon} due in next 30 days</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Facility & Safety Card */}
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-100 to-transparent dark:from-orange-900/20 rounded-bl-full" />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                {!isLoading && inspectionStats.facility.overdue > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {inspectionStats.facility.overdue} Overdue
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">Facility & Safety</CardTitle>
              <CardDescription>Fire/Life Safety & Building Inspections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-24" />
                </>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <span
                      className={`text-3xl font-bold ${getScoreColor(
                        getReadinessScore(inspectionStats.facility)
                      )}`}
                    >
                      {getReadinessScore(inspectionStats.facility)}%
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">Readiness</span>
                  </div>
                  <Progress
                    value={getReadinessScore(inspectionStats.facility)}
                    className="h-2"
                  />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>
                        {inspectionStats.facility.complete}/{inspectionStats.facility.total}{' '}
                        Complete
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>
                        {inspectionStats.facility.total - inspectionStats.facility.complete}{' '}
                        Pending
                      </span>
                    </div>
                  </div>
                  {inspectionStats.facility.dueSoon > 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span>{inspectionStats.facility.dueSoon} due in next 30 days</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Certifications Card */}
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100 to-transparent dark:from-blue-900/20 rounded-bl-full" />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {!isLoading && certStats.expired > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {certStats.expired} Expired
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">Certifications & Licenses</CardTitle>
              <CardDescription>Staff, Vendor & Facility Certifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-24" />
                </>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <span className={`text-3xl font-bold ${getScoreColor(
                      certStats.total > 0 
                        ? Math.round(((certStats.active) / certStats.total) * 100) 
                        : 100
                    )}`}>
                      {certStats.total > 0 
                        ? Math.round(((certStats.active) / certStats.total) * 100)
                        : 100}%
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">Active</span>
                  </div>
                  <Progress
                    value={certStats.total > 0 
                      ? (certStats.active / certStats.total) * 100 
                      : 100}
                    className="h-2"
                  />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{certStats.active} Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span>{certStats.total} Total</span>
                    </div>
                  </div>
                  {certStats.expiring > 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span>{certStats.expiring} expiring soon</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Summary Row */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      inspectionStats.doh.complete +
                      inspectionStats.facility.complete +
                      certStats.active
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Items Compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      inspectionStats.doh.dueSoon +
                      inspectionStats.facility.dueSoon +
                      certStats.expiring
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Due / Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      inspectionStats.doh.overdue +
                      inspectionStats.facility.overdue +
                      certStats.expired
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Overdue / Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      inspectionStats.doh.total +
                      inspectionStats.facility.total +
                      certStats.total
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Items Tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default ComplianceCenterLanding;
