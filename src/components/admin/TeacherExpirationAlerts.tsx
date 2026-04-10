import { useState, useEffect } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, FileText, User } from 'lucide-react';

interface ExpiringItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  school_name: string;
  type: 'document' | 'certification' | 'background_check';
  name: string;
  expiration_date: string;
  days_until_expiry: number;
}

const TeacherExpirationAlerts = () => {
  const [alerts, setAlerts] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiringItems();
  }, []);

  const fetchExpiringItems = async () => {
    try {
      const data = await analyticsService.getExpiringDocuments({ days: 30 });
      const items = Array.isArray(data) ? data : (data as any)?.data ?? [];

      const today = new Date();
      const mapped: ExpiringItem[] = items.map((item: any) => ({
        id: item.id,
        teacher_id: item.teacher_id ?? item.owner_user_id ?? '',
        teacher_name: item.teacher_name ?? item.owner_name ?? 'Unknown',
        school_name: item.school_name ?? 'Unknown',
        type: item.type ?? 'document',
        name: item.name ?? item.document_type ?? item.document_type_name ?? '',
        expiration_date: item.expiration_date ?? item.expires_at ?? '',
        days_until_expiry: item.days_until_expiry ?? Math.ceil(
          (new Date(item.expiration_date ?? item.expires_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

      mapped.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
      setAlerts(mapped);
    } catch (error: any) {
      console.error('Error fetching expiring items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return { label: 'Expired', color: 'destructive' };
    if (daysUntilExpiry <= 7) return { label: 'Critical', color: 'destructive' };
    if (daysUntilExpiry <= 14) return { label: 'Urgent', color: 'secondary' };
    return { label: 'Upcoming', color: 'default' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Expiration Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Expiration Alerts
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No expiring documents in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const severity = getSeverity(alert.days_until_expiry);
              return (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{alert.teacher_name}</span>
                      <Badge variant={severity.color as any}>{severity.label}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>{alert.school_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <FileText className="h-3 w-3" />
                        <span>{alert.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Expires: {new Date(alert.expiration_date).toLocaleDateString()}
                          {alert.days_until_expiry < 0
                            ? ` (${Math.abs(alert.days_until_expiry)} days ago)`
                            : ` (${alert.days_until_expiry} days)`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherExpirationAlerts;
