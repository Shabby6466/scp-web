import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { userService } from '@/services/userService';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, FileText, CheckCircle, Clock, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface ConsentStats {
  totalUsers: number;
  consented: number;
  pending: number;
  consentRate: number;
}

interface ConsentRecord {
  id: string;
  user_id: string;
  consent_given: boolean;
  consent_date: string;
  privacy_policy_version: string | null;
  profile?: {
    full_name: string;
    email: string;
  };
}

const PrivacyPolicySettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<ConsentStats>({
    totalUsers: 0,
    consented: 0,
    pending: 0,
    consentRate: 0,
  });
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [currentVersion, setCurrentVersion] = useState('1.0');
  const [policyNotes, setPolicyNotes] = useState('');

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
      fetchConsentData();
    }
  }, [isAdmin]);

  const fetchConsentData = async () => {
    try {
      const [profiles, consents] = await Promise.all([
        userService.list(),
        api.get('/user-consent'),
      ]);

      const profilesList = Array.isArray(profiles) ? profiles : profiles?.data ?? [];
      const consentsList = Array.isArray(consents) ? consents : consents?.data ?? [];

      const totalUsers = profilesList.length;
      const consented = consentsList.filter((c: any) => c.consent_given).length;
      const pending = totalUsers - consented;
      const consentRate = totalUsers > 0 ? Math.round((consented / totalUsers) * 100) : 0;

      setStats({ totalUsers, consented, pending, consentRate });

      const recordsWithProfiles = consentsList.map((consent: any) => {
        const profile = profilesList.find((p: any) => p.id === consent.user_id);
        return {
          ...consent,
          profile: profile ? { full_name: profile.full_name ?? profile.name ?? '', email: profile.email ?? '' } : undefined,
        };
      });

      setConsentRecords(recordsWithProfiles);

      if (consentsList.length > 0 && consentsList[0].privacy_policy_version) {
        setCurrentVersion(consentsList[0].privacy_policy_version);
      }
    } catch (error: any) {
      console.error('Error fetching consent data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading data',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      toast({
        title: 'Version updated',
        description: `Privacy policy version set to ${currentVersion}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
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
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
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
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Privacy Policy Settings
            </h1>
            <p className="text-muted-foreground">
              Manage platform privacy policies and user consent
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Consented
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.consented}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Consent Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.consentRate}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">
              <FileText className="h-4 w-4 mr-2" />
              Policy Settings
            </TabsTrigger>
            <TabsTrigger value="records">
              <Users className="h-4 w-4 mr-2" />
              Consent Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy Version</CardTitle>
                <CardDescription>
                  Manage the current privacy policy version. When you update the version, 
                  users may be prompted to re-accept the policy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="version">Current Version</Label>
                    <Input
                      id="version"
                      value={currentVersion}
                      onChange={(e) => setCurrentVersion(e.target.value)}
                      placeholder="1.0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use semantic versioning (e.g., 1.0, 1.1, 2.0)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Version Notes</Label>
                    <Textarea
                      id="notes"
                      value={policyNotes}
                      onChange={(e) => setPolicyNotes(e.target.value)}
                      placeholder="Describe what changed in this version..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleSaveVersion} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Version'}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Policy Components</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">FERPA Rights Notice</p>
                        <p className="text-sm text-muted-foreground">
                          Family Educational Rights and Privacy Act compliance
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">NYC DOH Requirements</p>
                        <p className="text-sm text-muted-foreground">
                          NYC Department of Health data collection requirements
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Data Protection & Security</p>
                        <p className="text-sm text-muted-foreground">
                          Encryption and security measures disclosure
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>User Consent Records</CardTitle>
                <CardDescription>
                  View all user consent records and their acceptance status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {consentRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No consent records found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consentRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.profile?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{record.profile?.email || '-'}</TableCell>
                          <TableCell>
                            {record.consent_given ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Accepted
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.privacy_policy_version || '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.consent_date), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default PrivacyPolicySettings;
