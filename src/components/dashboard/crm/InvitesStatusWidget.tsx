import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Mail,
  UserCheck,
  UserPlus,
  Clock,
  ChevronRight,
  Send,
} from 'lucide-react';
import type { InviteStats } from './types';

interface InvitesStatusWidgetProps {
  stats: InviteStats;
  loading?: boolean;
  onSendInvites?: () => void;
  onViewLog?: () => void;
}

export function InvitesStatusWidget({
  stats,
  loading = false,
  onSendInvites,
  onViewLog,
}: InvitesStatusWidgetProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Parent Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-6 w-10 mx-auto mb-1" />
                <Skeleton className="h-3 w-14 mx-auto" />
              </div>
            ))}
          </div>
          <Skeleton className="h-1.5 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const acceptanceRate = stats.totalInvited > 0 
    ? Math.round((stats.accepted / stats.totalInvited) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Parent Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-success" />
              <span className="text-xl font-semibold text-success tabular-nums">{stats.accepted}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Accepted</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5 text-warning-foreground" />
              <span className="text-xl font-semibold text-warning-foreground tabular-nums">{stats.pending}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pending</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xl font-semibold tabular-nums">{stats.notInvited}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Not Invited</p>
          </div>
        </div>

        {/* Acceptance Rate */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Acceptance Rate</span>
            <span className="font-medium">{acceptanceRate}%</span>
          </div>
          <Progress value={acceptanceRate} className="h-1.5" />
        </div>

        {/* Activity */}
        {stats.last7DaysActivity > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            {stats.last7DaysActivity} sent in last 7 days
          </p>
        )}

        {/* CTAs */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onSendInvites}
          >
            <Send className="h-4 w-4" />
            Send Invites
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => onViewLog ? onViewLog() : navigate('/school/parents')}
          >
            View Log
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
