import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Info } from 'lucide-react';

const AdminSubscriptions = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Subscription Management</h2>
        <p className="text-muted-foreground">
          Manage school subscriptions and billing
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Subscription management will be available once Stripe integration is set up. This will allow you to:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>View all school subscriptions and their status</li>
            <li>Manage billing for schools</li>
            <li>View payment history and upcoming charges</li>
            <li>Handle subscription upgrades and downgrades</li>
            <li>Process refunds and cancellations</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6" />
            <div>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>Stripe integration required</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            To enable subscription management, you'll need to set up Stripe integration. This will provide:
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <strong>Starter Plan</strong> - $49/month
              <p className="text-muted-foreground text-xs mt-1">Up to 50 students</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <strong>Professional Plan</strong> - $149/month
              <p className="text-muted-foreground text-xs mt-1">Up to 200 students</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <strong>Enterprise Plan</strong> - Custom pricing
              <p className="text-muted-foreground text-xs mt-1">Unlimited students</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
