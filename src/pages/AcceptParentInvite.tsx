import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '@/lib/api';
import type { LoginResponse } from '@/types/api';
import { invitationService } from '@/services/invitationService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, GraduationCap, Building2, Clock, XCircle } from 'lucide-react';
import logoImage from '@/assets/logo-nobg.png';

interface InvitationRecord {
  id: string;
  schoolId: string;
  branchId: string | null;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

type InviteErrorType = 'invalid' | 'expired' | 'already_accepted' | 'wrong_role' | 'error';

const AcceptParentInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getProfile } = useAuth();
  const { toast } = useToast();

  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [school, setSchool] = useState<{ name: string } | null>(null);
  const [errorType, setErrorType] = useState<InviteErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const validateInvitation = useCallback(async () => {
    if (!token) {
      setErrorType('invalid');
      setErrorMessage('Invalid invitation link. No token provided.');
      setLoading(false);
      return;
    }
    try {
      const res = await invitationService.validate(token);
      if (!res?.valid || !res.invitation) {
        setErrorType('invalid');
        setErrorMessage('This invitation link is invalid or does not exist.');
        setLoading(false);
        return;
      }

      const inv = res.invitation as InvitationRecord;
      if (String(inv.role).toUpperCase() !== 'PARENT') {
        setErrorType('wrong_role');
        setErrorMessage('This invitation is not for a parent account.');
        setLoading(false);
        return;
      }

      if (inv.status && String(inv.status).toUpperCase() !== 'PENDING') {
        setErrorType('already_accepted');
        setErrorMessage('This invitation has already been used.');
        setLoading(false);
        return;
      }

      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
        setErrorType('expired');
        setErrorMessage('This invitation has expired. Please contact the school for a new one.');
        setLoading(false);
        return;
      }

      setInvitation(inv);
      setEmail(inv.email);

      if (inv.schoolId) {
        try {
          const schoolData = await api.get(`/schools/${inv.schoolId}`);
          if (schoolData?.name) setSchool({ name: schoolData.name });
        } catch {
          /* optional */
        }
      }
    } catch (err: any) {
      console.error('Error validating invitation:', err);
      setErrorType('error');
      setErrorMessage('Failed to validate invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateInvitation();
  }, [validateInvitation]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const data = await api.post<LoginResponse>('/auth/register', {
          email,
          password,
          name: fullName,
          role: 'PARENT',
        });
        setToken(data.accessToken);
        await getProfile();
        toast({
          title: 'Account created!',
          description: 'You are signed in. Complete enrollment below.',
        });
      } else {
        const data = await api.post<LoginResponse>('/auth/login', { email, password });
        setToken(data.accessToken);
        await getProfile();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication failed',
        description: err?.message || 'Sign in failed',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user || !invitation || !token) return;

    setProcessing(true);

    try {
      await invitationService.accept(token, user.id);

      toast({
        title: 'Welcome!',
        description: 'Your account has been linked to the school successfully.',
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to complete enrollment. Please try again.',
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (errorType) {
    const errorConfig: Record<
      InviteErrorType,
      { icon: ReactNode; title: string; action: string; onAction: () => void }
    > = {
      invalid: {
        icon: <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />,
        title: 'Invalid Invitation',
        action: 'Go to Homepage',
        onAction: () => navigate('/'),
      },
      expired: {
        icon: <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />,
        title: 'Invitation Expired',
        action: 'Contact School',
        onAction: () => navigate('/'),
      },
      already_accepted: {
        icon: <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />,
        title: 'Already Accepted',
        action: 'Go to Dashboard',
        onAction: () => navigate('/dashboard'),
      },
      wrong_role: {
        icon: <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />,
        title: 'Wrong invitation type',
        action: 'Go to Homepage',
        onAction: () => navigate('/'),
      },
      error: {
        icon: <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />,
        title: 'Something Went Wrong',
        action: 'Try Again',
        onAction: () => window.location.reload(),
      },
    };

    const config = errorConfig[errorType];

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {config.icon}
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={config.onAction}>
              {config.action}
            </Button>
            {errorType === 'expired' && (
              <p className="text-sm text-muted-foreground text-center">Please ask the school to send you a new invitation link.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <img src={logoImage} alt="SCP" className="h-12 mx-auto mb-4" />
          <CardTitle className="text-2xl">Parent Enrollment</CardTitle>
          <CardDescription>You've been invited to join SCP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {school && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">School</p>
                  <p className="font-medium">{school.name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Invited email</p>
                <p className="font-medium">{invitation?.email}</p>
              </div>
            </div>
          </div>

          {user ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <p className="font-medium">Welcome back!</p>
                <p className="text-sm text-muted-foreground">
                  Signed in as <strong>{user.email}</strong>
                </p>
              </div>
              <Button onClick={handleAcceptInvitation} className="w-full">
                Complete enrollment
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSignUp ? 'Create Account & Enroll' : 'Sign In & Enroll'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptParentInvite;
