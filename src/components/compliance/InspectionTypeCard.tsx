import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { InspectionType, InspectionStats } from '@/hooks/useComplianceFramework';

interface InspectionTypeCardProps {
  type: InspectionType;
  stats: InspectionStats;
  icon: LucideIcon;
  colorClass: string;
  onClick: () => void;
}

const InspectionTypeCard = ({ type, stats, icon: Icon, colorClass, onClick }: InspectionTypeCardProps) => {
  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{type.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {stats.total_requirements} requirements
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Readiness</span>
            <span className="text-lg font-semibold">{stats.readiness_score}%</span>
          </div>
          <Progress 
            value={stats.readiness_score} 
            className="h-2"
          />
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {stats.completed_count > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
              {stats.completed_count} Complete
            </Badge>
          )}
          {stats.overdue_count > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdue_count} Overdue
            </Badge>
          )}
          {stats.due_30_days > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-yellow-700 border-yellow-300">
              <Clock className="h-3 w-3" />
              {stats.due_30_days} Due Soon
            </Badge>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-medium">{stats.due_30_days}</p>
            <p className="text-xs text-muted-foreground">30 days</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{stats.due_60_days}</p>
            <p className="text-xs text-muted-foreground">60 days</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{stats.due_90_days}</p>
            <p className="text-xs text-muted-foreground">90 days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InspectionTypeCard;
