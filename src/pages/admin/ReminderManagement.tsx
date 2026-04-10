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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{expiredLoading ? '-' : expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Bell className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical (≤7 days)</p>
                <p className="text-2xl font-bold">{docs7Loading ? '-' : criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgent (8-30 days)</p>
                <p className="text-2xl font-bold">{docs30Loading ? '-' : urgentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Trigger Sections */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* 30 Days Reminder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-orange-500" />
              30-Day Reminder
            </CardTitle>
            <CardDescription>
              Send reminders for documents expiring within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {docs30Loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>{expiringDocs30?.length || 0} documents will be included</>
                )}
              </div>
              <Button 
                onClick={handleTrigger30} 
                disabled={isTriggering30 || (expiringDocs30?.length || 0) === 0}
                className="w-full gap-2"
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
            </div>
          </CardContent>
        </Card>

        {/* 7 Days Reminder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-destructive" />
              7-Day Reminder
            </CardTitle>
            <CardDescription>
              Send urgent reminders for documents expiring within 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {docs7Loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>{criticalCount} documents will be included</>
                )}
              </div>
              <Button 
                onClick={handleTrigger7} 
                disabled={isTriggering7 || criticalCount === 0}
                className="w-full gap-2"
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
            </div>
          </CardContent>
        </Card>

        {/* Expired Documents Reminder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Expired Documents
            </CardTitle>
            <CardDescription>
              Send reminders for already expired documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {expiredLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>{expiredCount} documents will be included</>
                )}
              </div>
              <Button 
                onClick={handleTriggerExpired} 
                disabled={isTriggeringExpired || expiredCount === 0}
                className="w-full gap-2"
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Manual Reminders Only</p>
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
