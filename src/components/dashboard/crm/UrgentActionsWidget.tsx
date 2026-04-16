import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Clock,
  FileText,
  UserPlus,
  Shield,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import type { UrgentAction } from './types';

interface UrgentActionsWidgetProps {
  actions: UrgentAction[];
  loading?: boolean;
  onActionClick?: (action: UrgentAction) => void;
  lastUpdated?: Date;
}

const iconMap: Record<string, React.ElementType> = {
  documents: FileText,
  certifications: Shield,
  compliance: AlertTriangle,
  invites: UserPlus,
  default: Clock,
};

// Priority scoring function
export function calculatePriorityScore(action: UrgentAction): number {
  let score = 0;
  
  if (action.type === 'overdue') score += 100;
  else if (action.type === 'due-soon') {
    if (action.daysUntilDue !== undefined) {
      if (action.daysUntilDue <= 7) score += 60;
      else if (action.daysUntilDue <= 14) score += 30;
    } else {
      score += 45;
    }
  }
  else if (action.type === 'action-needed') score += 20;
  
  if (action.blocksCompliance) score += 40;
  if (action.count > 5) score += 30;
  if (action.isLicensingRelated) score += 50;
  
  return score;
}

export function UrgentActionsWidget({
  actions,
  loading = false,
  onActionClick,
  lastUpdated,
}: UrgentActionsWidgetProps) {
  const navigate = useNavigate();

  const handleClick = (action: UrgentAction) => {
    if (onActionClick) {
      onActionClick(action);
      return;
    }
    if (action.route) {
      navigate(action.route);
    }
  };

  const sortedActions = [...actions]
    .map(a => ({ ...a, priorityScore: a.priorityScore ?? calculatePriorityScore(a) }))
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 6);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Urgent Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            All Caught Up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success/30" />
            <p className="text-sm">No urgent actions needed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Urgent Actions
          </CardTitle>
          <Badge variant="error">{actions.length}</Badge>
        </div>
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {sortedActions.map((action) => {
          const Icon = iconMap[action.icon || 'default'] || iconMap.default;
          return (
            <div
              key={action.id}
              className={`flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg transition-colors group ${
                action.route || onActionClick ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default opacity-95'
              }`}
              onClick={() => handleClick(action)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  action.type === 'overdue' 
                    ? 'bg-error-light text-error' 
                    : action.type === 'due-soon'
                    ? 'bg-warning-light text-warning-foreground'
                    : 'bg-primary/8 text-primary'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {action.count} {action.label}
                  </p>
                  <Badge
                    variant={action.type === 'overdue' ? 'error' : action.type === 'due-soon' ? 'warning' : 'secondary'}
                  >
                    {action.type === 'overdue' ? 'Overdue' : action.type === 'due-soon' ? 'Due Soon' : 'Action Needed'}
                  </Badge>
                </div>
              </div>
              {(action.route || onActionClick) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-8 px-2"
                >
                  {action.ctaLabel}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
        
        {actions.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => navigate('/school/pending-documents')}
          >
            View all {actions.length} items
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
