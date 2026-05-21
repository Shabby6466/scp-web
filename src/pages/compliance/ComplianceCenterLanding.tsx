import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceData } from '@/hooks/useComplianceData';
import { COMPLIANCE_CATEGORY_SLUG } from '@/constants/complianceCategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Heart,
  Flame,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { SCHOOL_REQUIREMENTS } from '@/routes/appRoutes';

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
  const { stats: certDocStats, loading: certDocLoading } = useComplianceData(
    schoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.CERTIFICATIONS,
  );

  const isLoading = roleLoading || dohDocLoading || facilityDocLoading || certDocLoading;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const avgRate = (a?: number, b?: number) => Math.round(((a ?? 0) + (b ?? 0)) / 2);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">
            Compliance Center
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Compliance & Safety Dashboard</h1>
          <p className="text-muted-foreground max-w-2xl">
            Monitor document requirement completion by category. Configure templates on the
            Requirements page.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2 shrink-0">
          <Link to={SCHOOL_REQUIREMENTS.root}>
            <Settings className="h-4 w-4" />
            Manage requirements
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 w-fit">
              <Heart className="h-5 w-5 text-red-600" />
            </div>
            <CardTitle className="text-xl">DOH Compliance</CardTitle>
            <CardDescription>Health & enrollment documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-3xl font-bold ${getScoreColor(dohDocStats?.student_compliance_rate ?? 0)}`}>
                  {Math.round(dohDocStats?.student_compliance_rate ?? 0)}%
                </div>
                <Progress value={dohDocStats?.student_compliance_rate ?? 0} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {dohDocStats?.compliant_students ?? 0}/{dohDocStats?.total_students ?? 0} students ·{' '}
                  {dohDocStats?.compliant_teachers ?? 0}/{dohDocStats?.total_teachers ?? 0} staff
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 w-fit">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Facility & Safety</CardTitle>
            <CardDescription>Fire, life safety, facility docs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={`text-3xl font-bold ${getScoreColor(
                    avgRate(facilityDocStats?.student_compliance_rate, facilityDocStats?.teacher_compliance_rate),
                  )}`}
                >
                  {avgRate(
                    facilityDocStats?.student_compliance_rate,
                    facilityDocStats?.teacher_compliance_rate,
                  )}
                  %
                </div>
                <Progress
                  value={avgRate(
                    facilityDocStats?.student_compliance_rate,
                    facilityDocStats?.teacher_compliance_rate,
                  )}
                  className="h-2"
                />
                {(facilityDocStats?.total_expired ?? 0) > 0 && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {facilityDocStats?.total_expired} expired
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 w-fit">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Certifications</CardTitle>
            <CardDescription>Licenses & credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={`text-3xl font-bold ${getScoreColor(
                    avgRate(certDocStats?.student_compliance_rate, certDocStats?.teacher_compliance_rate),
                  )}`}
                >
                  {avgRate(
                    certDocStats?.student_compliance_rate,
                    certDocStats?.teacher_compliance_rate,
                  )}
                  %
                </div>
                {(certDocStats?.total_expiring_soon ?? 0) > 0 && (
                  <p className="text-sm text-yellow-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {certDocStats?.total_expiring_soon} expiring soon
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">
                {isLoading ? '—' : (dohDocStats?.compliant_students ?? 0) + (dohDocStats?.compliant_teachers ?? 0)}
              </div>
              <p className="text-sm text-muted-foreground">DOH compliant (sample)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold">
                {isLoading
                  ? '—'
                  : (dohDocStats?.total_expiring_soon ?? 0) +
                    (facilityDocStats?.total_expiring_soon ?? 0) +
                    (certDocStats?.total_expiring_soon ?? 0)}
              </div>
              <p className="text-sm text-muted-foreground">Expiring soon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">
                {isLoading
                  ? '—'
                  : (dohDocStats?.total_expired ?? 0) +
                    (facilityDocStats?.total_expired ?? 0) +
                    (certDocStats?.total_expired ?? 0)}
              </div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">—</div>
              <p className="text-sm text-muted-foreground">View sections in sidebar</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceCenterLanding;
