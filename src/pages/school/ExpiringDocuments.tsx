import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComplianceData } from '@/hooks/useComplianceData';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, Mail, Search, FileWarning } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/**
 * ExpiringDocuments - Document expiration management page
 * 
 * SCHOOL-ONLY PAGE: Only role='school', 'school_staff', 'admin', or 'director' can access.
 * Parents are redirected to their dashboard.
 */

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export default function ExpiringDocuments() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, canManageSchool, isParent, loading: roleLoading } = useUserRole();
  const { expiringDocs, expiredDocs, stats, loading } = useComplianceData();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'urgent' | 'upcoming'>('all');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Role-based access control
  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Not authenticated - redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // Parents should not see this page - redirect to parent dashboard
    if (isParent) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Only school-related roles can access
    if (!canManageSchool) {
      navigate('/not-authorized', { replace: true });
      return;
    }
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  // Don't render if not authorized
  if (!user || isParent || !canManageSchool) {
    return <LoadingSpinner />;
  }

  const filteredExpiring = expiringDocs.filter(doc => {
    const matchesSearch = doc.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || doc.entity_type === entityFilter;
    
    let matchesSeverity = true;
    if (severityFilter !== 'all') {
      if (severityFilter === 'critical' && doc.days_until_expiry > 7) matchesSeverity = false;
      if (severityFilter === 'urgent' && (doc.days_until_expiry <= 7 || doc.days_until_expiry > 30)) matchesSeverity = false;
      if (severityFilter === 'upcoming' && doc.days_until_expiry <= 30) matchesSeverity = false;
    }
    
    return matchesSearch && matchesEntity && matchesSeverity;
  });

  const filteredExpired = expiredDocs.filter(doc => {
    const matchesSearch = doc.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || doc.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const getSeverityBadge = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Critical</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="default" className="gap-1 bg-orange-500 hover:bg-orange-600"><Clock className="w-3 h-3" /> Urgent</Badge>;
    } else {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Upcoming</Badge>;
    }
  };

  const formatDocumentType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleSendReminders = async () => {
    setSendingReminder(true);
    try {
      await api.post('/notifications/expiration-reminders', { threshold: 30 });

      toast({
        title: "Reminders Sent",
        description: "Expiration reminder emails have been sent successfully.",
      });
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder emails.",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const criticalCount = expiringDocs.filter(d => d.days_until_expiry <= 7).length;
  const urgentCount = expiringDocs.filter(d => d.days_until_expiry > 7 && d.days_until_expiry <= 30).length;
  const upcomingCount = expiringDocs.filter(d => d.days_until_expiry > 30).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Expiration Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage expiring documents across your organization</p>
        </div>
        <Button onClick={handleSendReminders} disabled={sendingReminder} className="gap-2">
          <Mail className="w-4 h-4" />
          {sendingReminder ? 'Sending...' : 'Send Reminders'}
        </Button>
      </div>

      {/* Summary Widgets */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical (≤7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent (8-30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{urgentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Action needed soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming (31-60 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Monitor regularly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Already Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{expiredDocs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Overdue documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or document type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={entityFilter} onValueChange={(value: any) => setEntityFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="teacher">Teachers</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical (≤7 days)</SelectItem>
              <SelectItem value="urgent">Urgent (8-30 days)</SelectItem>
              <SelectItem value="upcoming">Upcoming (31-60 days)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabbed Tables */}
      <Tabs defaultValue="expiring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expiring" className="gap-2">
            <Clock className="w-4 h-4" />
            Expiring Soon ({filteredExpiring.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="gap-2">
            <FileWarning className="w-4 h-4" />
            Expired ({filteredExpired.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents Expiring Soon</CardTitle>
              <CardDescription>Documents that will expire within the next 60 days</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredExpiring.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No expiring documents found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Entity</th>
                        <th className="text-left py-3 px-4 font-medium">Document Type</th>
                        <th className="text-left py-3 px-4 font-medium">School</th>
                        <th className="text-left py-3 px-4 font-medium">Expiration Date</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpiring.map((doc) => (
                        <tr key={doc.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{doc.entity_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{doc.entity_type}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{formatDocumentType(doc.document_type)}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{doc.school_name}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{format(new Date(doc.expiration_date), 'MMM d, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">{doc.days_until_expiry} days remaining</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getSeverityBadge(doc.days_until_expiry)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expired Documents</CardTitle>
              <CardDescription>Documents that have already passed their expiration date</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredExpired.length === 0 ? (
                <div className="text-center py-12">
                  <FileWarning className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No expired documents found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Entity</th>
                        <th className="text-left py-3 px-4 font-medium">Document Type</th>
                        <th className="text-left py-3 px-4 font-medium">School</th>
                        <th className="text-left py-3 px-4 font-medium">Expired Date</th>
                        <th className="text-left py-3 px-4 font-medium">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpired.map((doc) => (
                        <tr key={doc.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{doc.entity_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{doc.entity_type}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{formatDocumentType(doc.document_type)}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{doc.school_name}</td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-destructive">{format(new Date(doc.expiration_date), 'MMM d, yyyy')}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="destructive">{doc.days_expired} days overdue</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
