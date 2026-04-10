import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Calendar } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

interface ExpirationAlertsProps {
  refreshTrigger: number;
}

const ExpirationAlerts = ({ refreshTrigger }: ExpirationAlertsProps) => {
  const { user } = useAuth();
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchExpiringDocuments();
    }
  }, [user, refreshTrigger]);

  const fetchExpiringDocuments = async () => {
    if (!user) return;

    try {
      const data = await documentService.listByOwner(user.id);

      if (data) {
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);

        const withExpiration = data.filter((doc: any) => doc.expiration_date);

        const expired = withExpiration.filter((doc: any) =>
          isBefore(new Date(doc.expiration_date), now)
        );

        const expiring = withExpiration.filter((doc: any) =>
          isAfter(new Date(doc.expiration_date), now) &&
          isBefore(new Date(doc.expiration_date), thirtyDaysFromNow)
        );

        setExpiredDocs(expired);
        setExpiringDocs(expiring);
      }
    } catch (error) {
      console.error('Error fetching expiring documents:', error);
    }
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    return differenceInDays(new Date(expirationDate), new Date());
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (expiredDocs.length === 0 && expiringDocs.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-lg">Expiration Alerts</CardTitle>
        </div>
        <CardDescription>
          Documents that require your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expiredDocs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">
              Expired Documents ({expiredDocs.length})
            </h4>
            {expiredDocs.map(doc => (
              <Alert key={doc.id} variant="destructive" className="py-3">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{doc.file_name}</p>
                      <p className="text-xs mt-1">{getCategoryLabel(doc.category)}</p>
                    </div>
                    <Badge variant="destructive">
                      Expired {format(new Date(doc.expiration_date!), 'MMM dd, yyyy')}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {expiringDocs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400">
              Expiring Soon ({expiringDocs.length})
            </h4>
            {expiringDocs.map(doc => {
              const daysLeft = getDaysUntilExpiration(doc.expiration_date!);
              return (
                <Alert key={doc.id} className="py-3 border-yellow-200 bg-white dark:bg-background">
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-xs mt-1">{getCategoryLabel(doc.category)}</p>
                      </div>
                      <Badge variant="outline" className="border-yellow-600 text-yellow-700">
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpirationAlerts;
