import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, GraduationCap, AlertTriangle, XCircle } from "lucide-react";
import { ComplianceGridSkeleton } from "@/components/dashboard/DashboardSkeletons";

interface ComplianceStats {
  total_students: number;
  compliant_students: number;
  student_compliance_rate: number;
  total_teachers: number;
  compliant_teachers: number;
  teacher_compliance_rate: number;
  total_expiring_soon: number;
  total_expired: number;
}

interface ComplianceOverviewProps {
  stats: ComplianceStats | null;
  loading: boolean;
}

export const ComplianceOverview = ({ stats, loading }: ComplianceOverviewProps) => {
  if (loading) {
    return <ComplianceGridSkeleton />;
  }

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Student Compliance</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getComplianceColor(stats?.student_compliance_rate || 0)}`}>
            {stats?.student_compliance_rate?.toFixed(1) || 0}%
          </div>
          <Progress 
            value={stats?.student_compliance_rate || 0} 
            className="mt-2 h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {stats?.compliant_students || 0} of {stats?.total_students || 0} students compliant
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Teacher Compliance</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getComplianceColor(stats?.teacher_compliance_rate || 0)}`}>
            {stats?.teacher_compliance_rate?.toFixed(1) || 0}%
          </div>
          <Progress 
            value={stats?.teacher_compliance_rate || 0} 
            className="mt-2 h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {stats?.compliant_teachers || 0} of {stats?.total_teachers || 0} teachers compliant
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {stats?.total_expiring_soon || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Documents expiring within 60 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expired</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats?.total_expired || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Documents requiring immediate attention
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
