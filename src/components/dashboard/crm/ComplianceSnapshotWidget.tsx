import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Building,
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface ComplianceCategory {
  name: string;
  percentage: number;
  overdueCount: number;
  dueSoonCount: number;
  icon: React.ElementType;
}

interface ComplianceSnapshotWidgetProps {
  dohCompliance?: ComplianceCategory;
  facilityCompliance?: ComplianceCategory;
  loading?: boolean;
}

function ComplianceCard({ category }: { category: ComplianceCategory }) {
  const Icon = category.icon;
  const isGood = category.percentage >= 80;
  const isWarning = category.percentage >= 60 && category.percentage < 80;

  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isGood ? 'bg-success-light text-success' : isWarning ? 'bg-warning-light text-warning-foreground' : 'bg-error-light text-error'
          }`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium">{category.name}</span>
        </div>
        <span className={`text-lg font-semibold tabular-nums ${
          isGood ? 'text-success' : isWarning ? 'text-warning-foreground' : 'text-error'
        }`}>
          {category.percentage}%
        </span>
      </div>
      
      <Progress 
        value={category.percentage} 
        className={`h-1 mb-2 ${
          isGood ? '[&>div]:bg-success' : isWarning ? '[&>div]:bg-warning' : '[&>div]:bg-error'
        }`}
      />
      
      <div className="flex gap-1.5">
        {category.overdueCount > 0 && (
          <Badge variant="error">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            {category.overdueCount} overdue
          </Badge>
        )}
        {category.dueSoonCount > 0 && (
          <Badge variant="warning">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            {category.dueSoonCount} due soon
          </Badge>
        )}
        {category.overdueCount === 0 && category.dueSoonCount === 0 && (
          <Badge variant="success">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
            On track
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ComplianceSnapshotWidget({
  dohCompliance,
  facilityCompliance,
  loading = false,
}: ComplianceSnapshotWidgetProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-10" />
                </div>
                <Skeleton className="h-1 w-full mb-2" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  const defaultDoh: ComplianceCategory = dohCompliance || {
    name: 'DOH Readiness',
    percentage: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    icon: Shield,
  };

  const defaultFacility: ComplianceCategory = facilityCompliance || {
    name: 'Facility & Safety',
    percentage: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    icon: Building,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <ComplianceCard category={{ ...defaultDoh, icon: Shield }} />
          <ComplianceCard category={{ ...defaultFacility, icon: Building }} />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => navigate('/compliance-center')}
        >
          Open Compliance Center
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
