import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { analyticsService } from '@/services/analyticsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Bell, 
  Clock, 
  RefreshCw,
  Mail,
  AlertTriangle,
  Send
} from 'lucide-react';

interface SchoolReminderSectionProps {
  schoolId: string;
}

interface ReminderResult {
  message: string;
  sent: number;
  skipped?: number;
  total_expiring?: number;
}

const SchoolReminderSection = ({ schoolId }: SchoolReminderSectionProps) => {
  const [isTriggering30, setIsTriggering30] = useState(false);
  const [isTriggering7, setIsTriggering7] = useState(false);
  const [isTriggeringExpired, setIsTriggeringExpired] = useState(false);

  const { data: expiringDocs30, isLoading: docs30Loading } = useQuery({
    queryKey: ['expiring-docs-30', schoolId],
    queryFn: async () => {
      const data = await analyticsService.expiringDocuments(30, schoolId);
      return data || [];
    },
  });

  const { data: expiringDocs7, isLoading: docs7Loading } = useQuery({
    queryKey: ['expiring-docs-7', schoolId],
    queryFn: async () => {
      const data = await analyticsService.expiringDocuments(7, schoolId);
      return data || [];
    },
  });

  const { data: expiredDocs, isLoading: expiredLoading } = useQuery({
    queryKey: ['expired-docs', schoolId],
    queryFn: async () => {
      const data = await analyticsService.expiredDocuments(schoolId);
      return data || [];
    },
  });

  const triggerReminders = useMutation({
    mutationFn: async (threshold: number) => {
      const data = await api.post('/reminders/send-expiration', {
        threshold,
        schoolId,
      });
      return data as ReminderResult;
    },
    onSuccess: (data) => {
      const extra =
        (data.skipped ?? 0) > 0
          ? ` (${data.skipped} skipped: cooldown or no email)`
          : '';
      toast.success(`Sent ${data.sent} reminder email(s)${extra}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });

  const triggerExpiredReminders = useMutation({
    mutationFn: async () => {
      const data = await api.post('/reminders/send-expiration', {
        threshold: 0,
        includeExpired: true,
        schoolId,
      });
      return data as ReminderResult;
    },
    onSuccess: (data) => {
      const extra =
        (data.skipped ?? 0) > 0
          ? ` (${data.skipped} skipped: cooldown or no email)`
          : '';
      toast.success(`Sent ${data.sent} expired-document reminder(s)${extra}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });

  const handleTrigger30 = async () => {
    setIsTriggering30(true);
    try {
      await triggerReminders.mutateAsync(30);
    } finally {
      setIsTriggering30(false);
    }
  };

  const handleTrigger7 = async () => {
    setIsTriggering7(true);
    try {
      await triggerReminders.mutateAsync(7);
    } finally {
      setIsTriggering7(false);
    }
  };

  const handleTriggerExpired = async () => {
    setIsTriggeringExpired(true);
    try {
      await triggerExpiredReminders.mutateAsync();
    } finally {
      setIsTriggeringExpired(false);
    }
  };

  const criticalCount = expiringDocs7?.length || 0;
  const urgentCount = (expiringDocs30?.length || 0) - criticalCount;
  const expiredCount = expiredDocs?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Send Parent Reminders
        </CardTitle>
        <CardDescription>
          Send email reminders to parents about expiring or expired documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-lg font-bold">{expiredLoading ? '-' : expiredCount}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10">
            <Bell className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-lg font-bold">{docs7Loading ? '-' : criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical (≤7 days)</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10">
            <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{docs30Loading ? '-' : urgentCount}</p>
            <p className="text-xs text-muted-foreground">Urgent (8-30 days)</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            onClick={handleTrigger30} 
            disabled={isTriggering30 || (expiringDocs30?.length || 0) === 0}
            variant="outline"
            className="gap-2"
          >
            {isTriggering30 ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            30-Day ({expiringDocs30?.length || 0})
          </Button>
          
          <Button 
            onClick={handleTrigger7} 
            disabled={isTriggering7 || criticalCount === 0}
            variant="outline"
            className="gap-2"
          >
            {isTriggering7 ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            7-Day ({criticalCount})
          </Button>
          
          <Button 
            onClick={handleTriggerExpired} 
            disabled={isTriggeringExpired || expiredCount === 0}
            variant="destructive"
            className="gap-2"
          >
            {isTriggeringExpired ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Expired ({expiredCount})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolReminderSection;
