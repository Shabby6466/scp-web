import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '@/services/analyticsService';
import { auditService } from '@/services/auditService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  School,
  Users,
  FileText,
  UserCheck,
  Clock,
  CheckCircle,
  Shield,
  ChevronRight,
  GraduationCap,
  Trash2,
  Activity,
  UserPlus as UserPlusIcon,
  Upload,
  AlertCircle,
  Info,
  Settings,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TeacherExpirationAlerts from './TeacherExpirationAlerts';
import { StatsGridSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PlatformStats {
  totalSchools: number;
  pendingSchools: number;
  approvedSchools: number;
  totalUsers: number;
  totalDocuments: number;
  pendingDocuments: number;
  totalStudents: number;
  totalTeachers: number;
}

interface AuditEvent {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  } | null;
}

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalSchools: 0,
    pendingSchools: 0,
    approvedSchools: 0,
    totalUsers: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setActivityLoading(true);
      const data = await auditService.list({ limit: 8 }) as AuditEvent[];
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await analyticsService.getDashboard();
      setStats({
        totalSchools: data.totalSchools ?? 0,
        pendingSchools: data.pendingSchools ?? 0,
        approvedSchools: data.approvedSchools ?? 0,
        totalUsers: data.totalUsers ?? 0,
        totalDocuments: data.totalDocuments ?? 0,
        pendingDocuments: data.pendingDocuments ?? 0,
        totalStudents: data.totalStudents ?? 0,
        totalTeachers: data.totalTeachers ?? 0,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        variant: 'destructive',
        title: 'Failed to load statistics',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Platform Overview</h2>
          <p className="text-muted-foreground">
            Real-time statistics across the platform
          </p>
        </div>
        <StatsGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
          Global Command Center
        </h2>
        <p className="text-muted-foreground font-medium">
          Analytics and oversight across the SCP ecosystem. Use the sidebar for
          students, staff, schools, and documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-primary/20 hover:border-primary/40 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Schools</CardDescription>
              <div className="p-2 rounded-full bg-primary/10">
                <School className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalSchools}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">
                {stats.approvedSchools} approved
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">
                {stats.pendingSchools} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 hover:border-primary/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Users</CardDescription>
              <div className="p-2 rounded-full bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total platform accounts
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 hover:border-primary/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Students</CardDescription>
              <div className="p-2 rounded-full bg-purple-500/10">
                <UserCheck className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalStudents}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Linked student profiles
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 hover:border-primary/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="font-medium">Total Teachers</CardDescription>
              <div className="p-2 rounded-full bg-emerald-500/10">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalTeachers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Shortcuts to common admin tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.pendingSchools > 0 && (
                <div
                  className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 cursor-pointer transition-all duration-200 shadow-sm"
                  onClick={() => navigate('/admin/schools')}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/schools')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shadow-inner">
                      <School className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-100">
                        {stats.pendingSchools} schools awaiting approval
                      </p>
                      <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                        Review in Schools
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="p-4 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 shadow-sm"
                onClick={() => navigate('/admin/documents')}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/documents')}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-inner">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.pendingDocuments} documents pending</p>
                    <p className="text-sm text-muted-foreground">Open document queue</p>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        <Card className="h-full backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-border/10">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle className="text-lg">Recent activity</CardTitle>
            </div>
            <CardDescription>Latest system-wide events</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[420px]">
              <div className="p-4 space-y-6">
                {activityLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                        <div className="h-2 w-1/2 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No recent activity detected</p>
                  </div>
                ) : (
                  recentActivity.map((event, i) => {
                    const Icon = getActivityIcon(event.action);
                    const color = getActivityColor(event.action);
                    return (
                      <div key={event.id} className="relative flex gap-4 group">
                        {i !== recentActivity.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-[-24px] w-[1px] bg-border/30 group-hover:bg-primary/20 transition-colors" />
                        )}
                        <div
                          className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm z-10 transition-transform group-hover:scale-110`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 pt-0.5">
                          <p className="text-sm font-medium leading-tight">
                            {event.user?.full_name || 'System'} {formatAction(event.action)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}{' '}
                            • {new Date(event.created_at).toLocaleDateString()}
                          </p>
                          {event.details && (
                            <p className="text-[10px] text-muted-foreground/60 italic font-mono mt-1 break-all line-clamp-1 group-hover:line-clamp-none transition-all">
                              {typeof event.details === 'string'
                                ? event.details
                                : JSON.stringify(event.details)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-border/10 bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => navigate('/admin/audit-logs')}
              >
                View full audit log
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <TeacherExpirationAlerts />
    </div>
  );
};

const getActivityIcon = (action: string) => {
  if (action.includes('create')) return UserPlusIcon;
  if (action.includes('update')) return Info;
  if (action.includes('delete') || action.includes('remove')) return Trash2;
  if (action.includes('upload')) return Upload;
  if (action.includes('approve') || action.includes('accept')) return CheckCircle;
  if (action.includes('reject') || action.includes('fail')) return AlertCircle;
  if (action.includes('login')) return Shield;
  if (action.includes('settings')) return Settings;
  return Activity;
};

const getActivityColor = (action: string) => {
  if (action.includes('create') || action.includes('upload'))
    return 'bg-blue-500/10 text-blue-500';
  if (
    action.includes('approve') ||
    action.includes('accept') ||
    action.includes('success')
  )
    return 'bg-emerald-500/10 text-emerald-500';
  if (
    action.includes('delete') ||
    action.includes('remove') ||
    action.includes('reject') ||
    action.includes('fail')
  )
    return 'bg-rose-500/10 text-rose-500';
  if (action.includes('login') || action.includes('auth'))
    return 'bg-purple-500/10 text-purple-500';
  return 'bg-amber-500/10 text-amber-500';
};

const formatAction = (action: string) => {
  return action.replace(/_/g, ' ').replace(/\./g, ' ');
};

export default AdminOverview;
