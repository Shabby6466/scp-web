import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowRight, Lock, Mail } from 'lucide-react';
import logo from '@/assets/logo-nobg.png';

const signInSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(1, 'Password is required')
});

type SignInFormData = z.infer<typeof signInSchema>;

const Auth = () => {
  const { signIn, user, loading: authLoading } = useAuth();
  const { loading: roleLoading, getDashboardPath } = useUserRole();
  const navigate = useNavigate();
  const [shutterActive, setShutterActive] = useState(false);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' }
  });

  useEffect(() => {
    const timer = setTimeout(() => setShutterActive(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authLoading || (user && roleLoading)) return;
    if (user && !roleLoading) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [user, authLoading, roleLoading, getDashboardPath, navigate]);

  if (authLoading || (user && roleLoading) || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  const onSignIn = async (data: SignInFormData) => {
    await signIn(data.email, data.password);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left - Minimal Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        {/* Shutter Layer */}
        <div 
          className={`absolute inset-0 bg-[#4169E1] transition-transform duration-[1200ms] ease-in-out z-1 ${
            shutterActive ? 'translate-x-0' : '-translate-x-full'
          }`}
        />
        
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 z-0" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          
            <span className="text-xl font-semibold text-white">Compli-ed</span>
          

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold text-white leading-tight">
              Compli-ed
            </h1>
            <p className="mt-4 text-white/70 text-lg">
              Preschool compliance, simplified.
            </p>
          </div>

          <p className="text-white/40 text-sm">© 2026 Compli-ed</p>
        </div>
      </div>

      {/* Right - Clean Form */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden p-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Compli-ed" className="h-8" />
            <span className="font-semibold text-foreground">Compli-ed</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
              <p className="mt-2 text-muted-foreground">Welcome back to your dashboard</p>
            </div>

            <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-11"
                    {...signInForm.register('email')}
                  />
                </div>
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11"
                    {...signInForm.register('password')}
                  />
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={signInForm.formState.isSubmitting}>
                {signInForm.formState.isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Parents, Teachers, Admins & Directors all sign in here
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">New school?</span>
              </div>
            </div>

            <Link
              to="/institution-auth"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
            >
              <Building2 className="h-4 w-4" />
              Register your institution
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
