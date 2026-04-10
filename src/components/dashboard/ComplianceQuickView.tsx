import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '@/services/analyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  ShieldCheck, 
  Award, 
  ChevronRight, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ComplianceQuickViewProps {
  schoolId: string;
  compact?: boolean;
}

interface ComplianceStats {
  doh: {
    studentCompliance: number;
    teacherCompliance: number;
    totalStudents: number;
    totalTeachers: number;
  };
  facility: {
    readinessScore: number;
    overdueCount: number;
    totalRequirements: number;
  };
  certifications: {
    expiringSoon: number;
    expired: number;
  };
}

export const ComplianceQuickView = ({ schoolId, compact = false }: ComplianceQuickViewProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchComplianceStats();
    }
  }, [schoolId]);

  const fetchComplianceStats = async () => {
    try {
      const complianceData = await analyticsService.getComplianceStats({ schoolId });
      const inspectionData = await analyticsService.getComplianceSummary(schoolId);
      const expiringData = await analyticsService.getExpiringDocuments({ schoolId, days: 30 });
      const expiredData = await analyticsService.getExpiredDocuments({ schoolId });

      const complianceArray = Array.isArray(complianceData) ? complianceData : [complianceData];
      const dohStats = complianceArray[0] || {
        student_compliance_rate: 0,
        teacher_compliance_rate: 0,
        total_students: 0,
        total_teachers: 0,
      };

      // Calculate facility stats from inspection data
      let facilityReadiness = 100;
      let facilityOverdue = 0;
      let totalRequirements = 0;
      
      const inspectionArray = Array.isArray(inspectionData) ? inspectionData : [];
      if (inspectionArray.length > 0) {
        const totals = inspectionArray.reduce((acc: any, item: any) => ({
          completed: acc.completed + (item.completed_count || 0),
          total: acc.total + (item.total_requirements || 0),
          overdue: acc.overdue + (item.overdue_count || 0),
        }), { completed: 0, total: 0, overdue: 0 });
        
        facilityReadiness = totals.total > 0 
          ? Math.round((totals.completed / totals.total) * 100) 
          : 100;
        facilityOverdue = totals.overdue;
        totalRequirements = totals.total;
      }

      // Filter expiring/expired for certifications (teacher-related)
      const expiringArray = Array.isArray(expiringData) ? expiringData : [];
      const expiredArray = Array.isArray(expiredData) ? expiredData : [];
      const schoolExpiring = expiringArray.filter(
        (d: any) => d.school_id === schoolId && 
        (d.document_type === 'certification' || d.document_type === 'background_check')
      );
      
      const schoolExpired = expiredArray.filter(
        (d: any) => d.school_id === schoolId && 
        (d.document_type === 'certification' || d.document_type === 'background_check')
      );

      setStats({
        doh: {
          studentCompliance: dohStats.student_compliance_rate || 0,
          teacherCompliance: dohStats.teacher_compliance_rate || 0,
          totalStudents: dohStats.total_students || 0,
          totalTeachers: dohStats.total_teachers || 0,
        },
        facility: {
          readinessScore: facilityReadiness,
          overdueCount: facilityOverdue,
          totalRequirements,
        },
        certifications: {
          expiringSoon: schoolExpiring.length,
          expired: schoolExpired.length,
        },
      });
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return { variant: 'default' as const, icon: CheckCircle, text: 'Good' };
    if (percentage >= 70) return { variant: 'secondary' as const, icon: Clock, text: 'Fair' };
    return { variant: 'destructive' as const, icon: AlertCircle, text: 'Needs Attention' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'DOH Compliance',
      icon: Heart,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      primaryValue: stats?.doh.studentCompliance || 0,
      primaryLabel: 'Student Compliance',
      secondaryValue: stats?.doh.teacherCompliance || 0,
      secondaryLabel: 'Teacher Compliance',
      path: '/compliance-center/doh',
    },
    {
      title: 'Facility & Safety',
      icon: ShieldCheck,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      primaryValue: stats?.facility.readinessScore || 0,
      primaryLabel: 'Readiness Score',
      overdueCount: stats?.facility.overdueCount || 0,
      path: '/compliance-center/facility',
    },
    {
      title: 'Certifications',
      icon: Award,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      expiringSoon: stats?.certifications.expiringSoon || 0,
      expired: stats?.certifications.expired || 0,
      path: '/compliance-center/certifications',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Compliance at a Glance
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/compliance-center')}
          className="gap-1"
        >
          View Compliance Center
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const isCertCard = card.title === 'Certifications';
          const hasPercentage = !isCertCard;
          const percentage = card.primaryValue || 0;
          const status = hasPercentage ? getStatusBadge(percentage) : null;
          const StatusIcon = status?.icon;

          return (
            <Card 
              key={index} 
              className="hover:shadow-md transition-all cursor-pointer group border-l-4"
              style={{
                borderLeftColor: percentage >= 90 
                  ? 'hsl(var(--chart-2))' 
                  : percentage >= 70 
                    ? 'hsl(var(--chart-4))' 
                    : 'hsl(var(--destructive))'
              }}
              onClick={() => navigate(card.path)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${card.iconColor}`} />
                    </div>
                    {card.title}
                  </CardTitle>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isCertCard ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expiring (30 days)</span>
                      <Badge 
                        variant={card.expiringSoon! > 0 ? 'secondary' : 'outline'}
                        className={card.expiringSoon! > 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                      >
                        {card.expiringSoon}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expired</span>
                      <Badge variant={card.expired! > 0 ? 'destructive' : 'outline'}>
                        {card.expired}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold ${getStatusColor(percentage)}`}>
                        {percentage}%
                      </span>
                      {status && StatusIcon && (
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{card.primaryLabel}</p>
                    {card.secondaryValue !== undefined && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{card.secondaryLabel}</span>
                          <span className={`font-medium ${getStatusColor(card.secondaryValue)}`}>
                            {card.secondaryValue}%
                          </span>
                        </div>
                      </div>
                    )}
                    {card.overdueCount !== undefined && card.overdueCount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Overdue Items</span>
                          <Badge variant="destructive">{card.overdueCount}</Badge>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ComplianceQuickView;
