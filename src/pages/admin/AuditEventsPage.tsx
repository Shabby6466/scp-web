import { useState, useEffect } from 'react';
import { auditService } from '@/services/auditService';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, Shield, User, FileText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  metadata: any;
  created_at: string;
}

interface AuthAuditLog {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

const AuditEventsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isAdmin } = useUserRole();
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'general' | 'auth'>('auth');

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (!isAdmin) {
      navigate('/not-authorized', { replace: true });
    }
  }, [user, authLoading, roleLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAuditData();
    }
  }, [isAdmin]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [authData, eventsData] = await Promise.all([
        api.get('/audit-events?type=auth&limit=200'),
        auditService.list({ limit: 200 }),
      ]);

      setAuthLogs(Array.isArray(authData) ? authData : authData?.data ?? []);
      setAuditEvents(Array.isArray(eventsData) ? eventsData : eventsData?.data ?? []);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" => {
    if (eventType.includes('failed') || eventType.includes('error')) return 'destructive';
    if (eventType.includes('sign_up') || eventType.includes('create')) return 'default';
    if (eventType.includes('sign_out') || eventType.includes('delete')) return 'secondary';
    return 'outline';
  };

  const filteredAuthLogs = authLogs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || log.event_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredAuditEvents = auditEvents.filter(event => {
    const matchesSearch = searchQuery === '' || 
      event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || event.event_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const uniqueAuthEventTypes = [...new Set(authLogs.map(log => log.event_type))];
  const uniqueGeneralEventTypes = [...new Set(auditEvents.map(event => event.event_type))];

  if (authLoading || roleLoading || (!isAdmin && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Audit Logs</h1>
          </div>
          <p className="text-muted-foreground">View authentication events and system activity</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'auth' ? 'default' : 'outline'}
            onClick={() => setActiveTab('auth')}
          >
            <User className="h-4 w-4 mr-2" />
            Auth Events
          </Button>
          <Button
            variant={activeTab === 'general' ? 'default' : 'outline'}
            onClick={() => setActiveTab('general')}
          >
            <FileText className="h-4 w-4 mr-2" />
            System Events
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {(activeTab === 'auth' ? uniqueAuthEventTypes : uniqueGeneralEventTypes).map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchAuditData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Auth Events Table */}
        {activeTab === 'auth' && (
          <Card>
            <CardHeader>
              <CardTitle>Authentication Events</CardTitle>
              <CardDescription>
                {filteredAuthLogs.length} events found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredAuthLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No authentication events found</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuthLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant={getEventBadgeVariant(log.event_type)}>
                              {log.event_type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.email || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {log.ip_address || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* General Events Table */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>System Events</CardTitle>
              <CardDescription>
                {filteredAuditEvents.length} events found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredAuditEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No system events found</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditEvents.map(event => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant={getEventBadgeVariant(event.event_type)}>
                              {event.event_type.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{event.entity_type}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {event.entity_id?.substring(0, 8) || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AuditEventsPage;
