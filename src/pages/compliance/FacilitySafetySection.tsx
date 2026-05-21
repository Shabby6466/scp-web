import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useComplianceData } from '@/hooks/useComplianceData';
import { COMPLIANCE_CATEGORY_SLUG } from '@/constants/complianceCategories';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, CheckCircle, AlertTriangle, Clock, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SCHOOL_REQUIREMENTS } from '@/routes/appRoutes';

const FacilitySafetySection = () => {
  const { schoolId } = useUserRole();
  const { stats: facilityDocStats, loading } = useComplianceData(
    schoolId,
    undefined,
    COMPLIANCE_CATEGORY_SLUG.FACILITY_SAFETY,
  );

  const avgRate =
    facilityDocStats == null
      ? 0
      : Math.round(
          ((facilityDocStats.student_compliance_rate ?? 0) +
            (facilityDocStats.teacher_compliance_rate ?? 0)) /
            2,
        );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <Badge variant="secondary">Facility & Safety</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">Facility & Safety</h1>
          <p className="text-muted-foreground max-w-2xl">
            Read-only compliance view for facility and safety document requirements. Add or edit
            templates on the Requirements page.
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link to={SCHOOL_REQUIREMENTS.schoolDirectors}>
            <Settings className="h-4 w-4" />
            Configure requirements
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg compliance</p>
            <div className="text-3xl font-bold mt-1">
              {loading ? <Skeleton className="h-8 w-16" /> : `${avgRate}%`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Staff compliant</p>
              <div className="text-3xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  `${facilityDocStats?.compliant_teachers ?? 0}/${facilityDocStats?.total_teachers ?? 0}`
                )}
              </div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expiring soon</p>
              <div className="text-3xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  facilityDocStats?.total_expiring_soon ?? 0
                )}
              </div>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expired</p>
              <div className="text-3xl font-bold text-red-600">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  facilityDocStats?.total_expired ?? 0
                )}
              </div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FacilitySafetySection;
