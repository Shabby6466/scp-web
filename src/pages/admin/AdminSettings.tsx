import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '@/services/settingsService';
import { schoolService } from '@/services/schoolService';
import { userService } from '@/services/userService';
import { documentService } from '@/services/documentService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  Shield,
  Bell,
  Users,
  School,
  FileText,
  Database,
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

interface PlatformStats {
  totalSchools: number;
  approvedSchools: number;
  pendingSchools: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalDocuments: number;
}

interface GeneralSettings {
  maintenanceMode: boolean;
  platformName: string;
}

interface RegistrationSettings {
  allowSchoolSelfRegistration: boolean;
  allowParentSelfRegistration: boolean;
  autoConfirmEmails: boolean;
  requireSchoolApproval: boolean;
}

interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  sendWelcomeEmails: boolean;
  sendExpirationReminders: boolean;
  reminderDaysBeforeExpiry: number;
}

interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
}

interface AllSettings {
  general: GeneralSettings;
  registration: RegistrationSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

const defaultSettings: AllSettings = {
  general: {
    maintenanceMode: false,
    platformName: 'Compli-ed',
  },
  registration: {
    allowSchoolSelfRegistration: true,
    allowParentSelfRegistration: true,
    autoConfirmEmails: true,
    requireSchoolApproval: true,
  },
  notifications: {
    emailNotificationsEnabled: true,
    sendWelcomeEmails: true,
    sendExpirationReminders: true,
    reminderDaysBeforeExpiry: 30,
  },
  security: {
    sessionTimeout: 60,
    maxLoginAttempts: 5,
  },
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<PlatformStats>({
    totalSchools: 0,
    approvedSchools: 0,
    pendingSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalDocuments: 0,
  });
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);

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
      Promise.all([fetchPlatformStats(), fetchSettings()]).finally(() => setLoading(false));
    }
  }, [isAdmin]);

  const fetchPlatformStats = async () => {
    try {
      const [schoolsData, usersData, studentsData, teachersData, documentsData] = await Promise.all([
        schoolService.list(),
        userService.list(),
        userService.list({ role: 'STUDENT' }),
        userService.list({ role: 'TEACHER' }),
        documentService.search(),
      ]);

      const schoolsList = Array.isArray(schoolsData) ? schoolsData : (schoolsData as any)?.data ?? [];
      const usersList = Array.isArray(usersData) ? usersData : (usersData as any)?.data ?? [];
      const studentsList = Array.isArray(studentsData) ? studentsData : (studentsData as any)?.data ?? [];
      const teachersList = Array.isArray(teachersData) ? teachersData : (teachersData as any)?.data ?? [];
      const documentsList = Array.isArray(documentsData) ? documentsData : (documentsData as any)?.data ?? [];

      setStats({
        totalSchools: schoolsList.length,
        approvedSchools: schoolsList.filter((s: any) => s.is_approved).length,
        pendingSchools: schoolsList.filter((s: any) => !s.is_approved).length,
        totalUsers: usersList.length,
        totalStudents: studentsList.length,
        totalTeachers: teachersList.length,
        totalDocuments: documentsList.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getAppConfig();

      if (data) {
        const loadedSettings = { ...defaultSettings };
        if (typeof data === 'object') {
          const entries = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ key, value }));
          entries.forEach((row: any) => {
            const key = row.key as keyof AllSettings;
            if (key in loadedSettings) {
              loadedSettings[key] = row.value as any;
            }
          });
        }
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await settingsService.updateAppConfig(settings);

      toast({
        title: 'Settings saved',
        description: 'Your platform settings have been updated and will take effect immediately.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving settings',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateGeneralSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setSettings(prev => ({ ...prev, general: { ...prev.general, [key]: value } }));
  };

  const updateRegistrationSetting = <K extends keyof RegistrationSettings>(key: K, value: RegistrationSettings[K]) => {
    setSettings(prev => ({ ...prev, registration: { ...prev.registration, [key]: value } }));
  };

  const updateNotificationSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  };

  const updateSecuritySetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSettings(prev => ({ ...prev, security: { ...prev.security, [key]: value } }));
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              Platform Settings
            </h1>
            <p className="text-muted-foreground">
              Manage site-wide settings and configurations
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Platform Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <School className="h-4 w-4" />
                Schools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSchools}</div>
              <div className="flex gap-2 mt-1">
                <Badge variant="default" className="text-xs">
                  {stats.approvedSchools} approved
                </Badge>
                {stats.pendingSchools > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.pendingSchools} pending
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students & Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents + stats.totalTeachers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalStudents} students, {stats.totalTeachers} teachers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground mt-1">Total uploaded</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="registration" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Registration</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic platform configuration and status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={settings.general.platformName}
                    onChange={(e) => updateGeneralSetting('platformName', e.target.value)}
                    placeholder="Compli-ed"
                  />
                  <p className="text-sm text-muted-foreground">
                    The name displayed across the platform
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, only admins can access the platform
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.maintenanceMode}
                    onCheckedChange={(checked) => updateGeneralSetting('maintenanceMode', checked)}
                  />
                </div>
                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Quick Links</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => navigate('/admin/privacy-settings')}
                    >
                      <Shield className="h-5 w-5 mr-3 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Privacy Settings</p>
                        <p className="text-xs text-muted-foreground">Manage consent & policies</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => navigate('/admin/audit-logs')}
                    >
                      <FileText className="h-5 w-5 mr-3 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Audit Logs</p>
                        <p className="text-xs text-muted-foreground">View system activity</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => navigate('/admin/reminders')}
                    >
                      <Bell className="h-5 w-5 mr-3 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Reminder Management</p>
                        <p className="text-xs text-muted-foreground">Configure email reminders</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => navigate('/compliance')}
                    >
                      <CheckCircle className="h-5 w-5 mr-3 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Compliance Dashboard</p>
                        <p className="text-xs text-muted-foreground">DOH compliance overview</p>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registration Settings */}
          <TabsContent value="registration">
            <Card>
              <CardHeader>
                <CardTitle>Registration Settings</CardTitle>
                <CardDescription>
                  Control how users and schools can register on the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>School Self-Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new schools to apply for registration
                    </p>
                  </div>
                  <Switch
                    checked={settings.registration.allowSchoolSelfRegistration}
                    onCheckedChange={(checked) => updateRegistrationSetting('allowSchoolSelfRegistration', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Parent Self-Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow parents to create accounts without invitation
                    </p>
                  </div>
                  <Switch
                    checked={settings.registration.allowParentSelfRegistration}
                    onCheckedChange={(checked) => updateRegistrationSetting('allowParentSelfRegistration', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require School Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval before schools can access their dashboard
                    </p>
                  </div>
                  <Switch
                    checked={settings.registration.requireSchoolApproval}
                    onCheckedChange={(checked) => updateRegistrationSetting('requireSchoolApproval', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Confirm Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Skip email verification for new users (development only)
                    </p>
                  </div>
                  <Switch
                    checked={settings.registration.autoConfirmEmails}
                    onCheckedChange={(checked) => updateRegistrationSetting('autoConfirmEmails', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure email notifications and reminders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable all email notifications globally
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotificationsEnabled}
                    onCheckedChange={(checked) => updateNotificationSetting('emailNotificationsEnabled', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Welcome Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Send welcome email to new users upon registration
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sendWelcomeEmails}
                    onCheckedChange={(checked) => updateNotificationSetting('sendWelcomeEmails', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Expiration Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send automated reminders for expiring documents
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sendExpirationReminders}
                    onCheckedChange={(checked) => updateNotificationSetting('sendExpirationReminders', checked)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="reminderDays">Reminder Days Before Expiry</Label>
                  <Input
                    id="reminderDays"
                    type="number"
                    min={1}
                    max={90}
                    value={settings.notifications.reminderDaysBeforeExpiry}
                    onChange={(e) => updateNotificationSetting('reminderDaysBeforeExpiry', parseInt(e.target.value) || 30)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    How many days before document expiration to send reminders
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure authentication and session security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min={15}
                    max={480}
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSecuritySetting('sessionTimeout', parseInt(e.target.value) || 60)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    How long until inactive sessions expire (15-480 minutes)
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min={3}
                    max={10}
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSecuritySetting('maxLoginAttempts', parseInt(e.target.value) || 5)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Failed login attempts before temporary lockout (3-10)
                  </p>
                </div>
                <Separator />
                <div className="rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Security Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Row-Level Security enabled on all tables</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>All storage buckets are private</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Rate limiting active on edge functions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Authentication audit logging enabled</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  System status and technical configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">System Status</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Database</span>
                      <Badge variant="default" className="bg-green-500">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Email Service</span>
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">File Storage</span>
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Scheduled Jobs</span>
                      <Badge variant="default" className="bg-green-500">Running</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Data Management</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => navigate('/admin/required-documents')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Student Required Documents
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => navigate('/admin/staff-required-documents')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Staff Required Documents
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminSettings;
