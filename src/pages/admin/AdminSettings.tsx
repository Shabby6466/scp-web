import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '@/services/settingsService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, RefreshCw, Shield } from 'lucide-react';

/** Matches backend `AppConfig` / GET + PATCH `/api/settings` (admin). */
interface AppSettingsForm {
  otpEmailVerificationEnabled: boolean;
  selfRegistrationEnabled: boolean;
}

const defaults: AppSettingsForm = {
  otpEmailVerificationEnabled: true,
  selfRegistrationEnabled: true,
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppSettingsForm>(defaults);

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
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await settingsService.getAppConfig();
        if (cancelled || !data || typeof data !== 'object') return;
        setForm({
          otpEmailVerificationEnabled:
            typeof (data as AppSettingsForm).otpEmailVerificationEnabled === 'boolean'
              ? (data as AppSettingsForm).otpEmailVerificationEnabled
              : defaults.otpEmailVerificationEnabled,
          selfRegistrationEnabled:
            typeof (data as AppSettingsForm).selfRegistrationEnabled === 'boolean'
              ? (data as AppSettingsForm).selfRegistrationEnabled
              : defaults.selfRegistrationEnabled,
        });
      } catch (e) {
        console.error(e);
        toast({
          variant: 'destructive',
          title: 'Could not load settings',
          description: 'Try again in a moment.',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateAppConfig({
        otpEmailVerificationEnabled: form.otpEmailVerificationEnabled,
        selfRegistrationEnabled: form.selfRegistrationEnabled,
      });
      toast({
        title: 'Settings saved',
        description: 'Platform options are updated.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed';
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || roleLoading || (!isAdmin && user)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Platform settings</h1>
          <p className="text-sm text-muted-foreground">
            Options that apply to the whole product (sign-up and email verification).
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shrink-0">
          {saving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Access & registration</CardTitle>
          </div>
          <CardDescription>
            These map to your server configuration. Changes apply immediately for new sign-ins and
            registrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="selfReg">Self-service registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow teachers and other roles to create an account from the public sign-up flow.
              </p>
            </div>
            <Switch
              id="selfReg"
              checked={form.selfRegistrationEnabled}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, selfRegistrationEnabled: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="otp">Email verification (OTP)</Label>
              <p className="text-sm text-muted-foreground">
                Require a one-time code sent by email before users can sign in. Turn off only for
                local development if needed.
              </p>
            </div>
            <Switch
              id="otp"
              checked={form.otpEmailVerificationEnabled}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, otpEmailVerificationEnabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
