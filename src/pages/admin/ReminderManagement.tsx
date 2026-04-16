import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { api } from '@/lib/api';
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

interface ReminderResult {
  message: string;
  sent: number;
  total_expiring?: number;
}

const ReminderManagement = () => {
  const [isTriggering30, setIsTriggering30] = useState(false);
  const [isTriggering7, setIsTriggering7] = useState(false);
  const [isTriggeringExpired, setIsTriggeringExpired] = useState(false);

  const { data: expiringDocs30, isLoading: docs30Loading } = useQuery({
    queryKey: ['expiring-docs-30'],
    queryFn: async () => {
      const data = await analyticsService.getExpiringDocuments({ days: 30 });
      return Array.isArray(data) ? data : data?.data ?? [];
    },
  });

  const { data: expiringDocs7, isLoading: docs7Loading } = useQuery({
    queryKey: ['expiring-docs-7'],
    queryFn: async () => {
      const data = await analyticsService.getExpiringDocuments({ days: 7 });
      return Array.isArray(data) ? data : data?.data ?? [];
    },
  });

  const { data: expiredDocs, isLoading: expiredLoading } = useQuery({
    queryKey: ['expired-docs'],
    queryFn: async () => {
      const data = await analyticsService.getExpiredDocuments();
      return Array.isArray(data) ? data : data?.data ?? [];
    },
  });

  const triggerReminders = useMutation({
    mutationFn: async (threshold: number) => {
      const data = await api.post('/reminders/send', { threshold });
      return data as ReminderResult;
    },
    onSuccess: (data) => {
      toast.success(`Sent ${data.sent} reminder emails`);
    },
    onError: (error: any) => {
      toast.error(`Failed to send reminders: ${error.message}`);
    },
  });

  const triggerExpiredReminders = useMutation({
    mutationFn: async () => {
      const data = await api.post('/reminders/send', { threshold: 0, includeExpired: true });
      return data as ReminderResult;
    },
    onSuccess: (data) => {
      toast.success(`Sent ${data.sent} reminder emails for expired documents`);
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
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-display font-bold">
          <Bell className="h-8 w-8 text-primary" />
          Reminders
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review expiring documents and send manual reminder emails to staff
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <Card className="flex min-h-[5.5rem] flex-col">
          <CardContent className="flex flex-1 items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold tabular-nums">{expiredLoading ? '—' : expiredCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[5.5rem] flex-col">
          <CardContent className="flex flex-1 items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <Bell className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Critical (≤7 days)</p>
              <p className="text-2xl font-bold tabular-nums">{docs7Loading ? '—' : criticalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[5.5rem] flex-col">
          <CardContent className="flex flex-1 items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Urgent (8-30 days)</p>
              <p className="text-2xl font-bold tabular-nums">{docs30Loading ? '—' : urgentCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Trigger Sections */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {/* 30 Days Reminder */}
        <Card className="flex h-full flex-col">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
              <Mail className="h-5 w-5 shrink-0 text-orange-500" />
              30-Day Reminder
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Send reminders for documents expiring within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-2">
            <div className="min-h-[1.25rem] text-sm leading-relaxed text-muted-foreground">
              {docs30Loading ? (
                <Skeleton className="h-4 w-36" />
              ) : (
                <span>{expiringDocs30?.length || 0} documents will be included</span>
              )}
            </div>
            <Button
              onClick={handleTrigger30}
              disabled={isTriggering30 || (expiringDocs30?.length || 0) === 0}
              className="mt-auto w-full justify-center gap-2"
              variant="outline"
            >
                {isTriggering30 ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reminders
                  </>
                )}
              </Button>
          </CardContent>
        </Card>

        {/* 7 Days Reminder */}
        <Card className="flex h-full flex-col">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
              <Mail className="h-5 w-5 shrink-0 text-destructive" />
              7-Day Reminder
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Send urgent reminders for documents expiring within 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-2">
            <div className="min-h-[1.25rem] text-sm leading-relaxed text-muted-foreground">
              {docs7Loading ? (
                <Skeleton className="h-4 w-36" />
              ) : (
                <span>{criticalCount} documents will be included</span>
              )}
            </div>
            <Button
              onClick={handleTrigger7}
              disabled={isTriggering7 || criticalCount === 0}
              className="mt-auto w-full justify-center gap-2"
              variant="outline"
            >
                {isTriggering7 ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reminders
                  </>
                )}
              </Button>
          </CardContent>
        </Card>

        {/* Expired Documents Reminder */}
        <Card className="flex h-full flex-col">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold leading-snug">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              Expired Documents
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Send reminders for already expired documents
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-2">
            <div className="min-h-[1.25rem] text-sm leading-relaxed text-muted-foreground">
              {expiredLoading ? (
                <Skeleton className="h-4 w-36" />
              ) : (
                <span>{expiredCount} documents will be included</span>
              )}
            </div>
            <Button
              onClick={handleTriggerExpired}
              disabled={isTriggeringExpired || expiredCount === 0}
              className="mt-auto w-full justify-center gap-2"
              variant="destructive"
            >
                {isTriggeringExpired ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reminders
                  </>
                )}
              </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-border/60 bg-muted/40">
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-sm">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p className="text-base font-semibold text-foreground">Manual reminders only</p>
              <p>
                Reminder emails are sent manually by administrators. Use the buttons above to send
                reminders at 30 days before expiration, 7 days before expiration, or for already
                expired documents. No automatic emails are sent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReminderManagement;
