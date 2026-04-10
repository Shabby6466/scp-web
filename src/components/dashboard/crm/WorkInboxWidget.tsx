import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Inbox,
  FileText,
  UserPlus,
  Shield,
  Clock,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { InboxItem, InboxItemType } from './types';
import { formatDistanceToNow } from 'date-fns';

interface WorkInboxWidgetProps {
  items: InboxItem[];
  loading?: boolean;
  onItemClick?: (item: InboxItem) => void;
}

const typeConfig: Record<InboxItemType, { icon: typeof FileText; label: string; color: string }> = {
  document: { icon: FileText, label: 'Doc', color: 'bg-info/8 text-info border-info/20' },
  invite: { icon: UserPlus, label: 'Invite', color: 'bg-success-light text-success border-success/20' },
  requirement: { icon: Shield, label: 'Req', color: 'bg-purple-500/8 text-purple-600 border-purple-200' },
  expiring: { icon: Clock, label: 'Expiring', color: 'bg-warning-light text-warning-foreground border-warning/20' },
  missing: { icon: AlertTriangle, label: 'Missing', color: 'bg-error-light text-error border-error/20' },
};

export function WorkInboxWidget({ items, loading = false, onItemClick }: WorkInboxWidgetProps) {
  const navigate = useNavigate();

  const handleClick = (item: InboxItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else {
      navigate(item.route);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Work Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2.5">
              <Skeleton className="h-5 w-12 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Work Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success/30" />
            <p className="text-sm font-medium">Inbox Zero!</p>
            <p className="text-xs mt-0.5">No items need attention</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedItems = [...items].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Work Inbox
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary">{items.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {sortedItems.map((item) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          const isOverdue = item.daysOverdue && item.daysOverdue > 0;

          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 py-2.5 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group"
              onClick={() => handleClick(item)}
            >
              <Badge variant="outline" className={`shrink-0 px-1.5 py-0 h-5 border ${config.color}`}>
                <Icon className="h-2.5 w-2.5 mr-0.5" />
                {config.label}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.entityName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isOverdue ? (
                  <Badge variant="error">
                    {item.daysOverdue}d late
                  </Badge>
                ) : item.dueDate ? (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                  </span>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-1.5"
                >
                  {item.ctaLabel}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
        
        {items.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => navigate('/school/pending-documents')}
          >
            View all {items.length} items
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
