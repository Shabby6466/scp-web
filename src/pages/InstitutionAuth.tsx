import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle, FileCheck, Shield, Clock } from 'lucide-react';
import Header from '@/components/Header';
import { Alert, AlertDescription } from '@/components/ui/alert';

const signUpSchema = z.object({
  institutionName: z.string().trim().min(2, 'Institution name must be at least 2 characters').max(100, 'Institution name must be less than 100 characters'),
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const InstitutionAuth = () => {
  const { signUp, user } = useAuth();
  const { role, loading: roleLoading, getDashboardPath } = useUserRole();
  const navigate = useNavigate();
  
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      institutionName: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Redirect logged-in users to their appropriate dashboard
  useEffect(() => {
    if (user && !roleLoading) {
      const hasInstitutionName = user.user_metadata?.institution_name;
      
      // If user has institution_name in metadata but no role (or role is null/school),
      // they need to complete school registration
      if (hasInstitutionName && (!role || role === 'school')) {
        navigate('/school-register', { replace: true });
      } else if (role) {
        // User has a role, redirect to their dashboard
        const dashboardPath = getDashboardPath();
        navigate(dashboardPath, { replace: true });
      }
      // If user has no role and no institution_name, they stay on this page
      // (This shouldn't happen normally)
    }
  }, [user, role, roleLoading, getDashboardPath, navigate]);
  const onSignUp = async (data: SignUpFormData) => {
    await signUp(data.email, data.password, data.fullName, undefined, data.institutionName);
  };
  return <div className="min-h-screen bg-background">
      <Header hideParentPortal />
      <div className="flex items-center justify-center p-4 pt-24 pb-12">
        <div className="w-full max-w-4xl space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg">
                <Building2 className="h-9 w-9 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-display font-bold">Institution Registration Portal</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join PreSchool Portal to streamline your documentation management, enhance parent communication, and ensure regulatory compliance.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold">Secure & Compliant</h3>
                  <p className="text-sm text-muted-foreground">
                    Bank-level security with automated compliance tracking
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold">Document Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Centralized system for all student documentation
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold">Save Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Reduce administrative workload by up to 70%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Process */}
          <Card className="bg-muted/50 border-2">
            <CardHeader>
              <CardTitle className="text-center">Application Process</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <h4 className="font-semibold">Create Account</h4>
                  <p className="text-sm text-muted-foreground">Sign up with your institution email</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <h4 className="font-semibold">Complete Application</h4>
                  <p className="text-sm text-muted-foreground">Provide institution details and licensing info</p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <h4 className="font-semibold">Get Approved</h4>
                  <p className="text-sm text-muted-foreground">Review within 2-4 business days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Create Your Institution Account</CardTitle>
              <CardDescription>Sign up to submit your institution application</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  After creating your account, you'll be directed to complete the full institution application form with licensing and facility details.
                </AlertDescription>
              </Alert>
              
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-institutionName">Institution Name *</Label>
                  <Input id="signup-institutionName" placeholder="(Name of Institution)" {...signUpForm.register('institutionName')} />
                  {signUpForm.formState.errors.institutionName && <p className="text-sm text-destructive">{signUpForm.formState.errors.institutionName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-fullName">Your Full Name *</Label>
                  <Input id="signup-fullName" placeholder="(John Doe)" {...signUpForm.register('fullName')} />
                  {signUpForm.formState.errors.fullName && <p className="text-sm text-destructive">{signUpForm.formState.errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Institution Email *</Label>
                  <Input id="signup-email" type="email" placeholder="(admin@yourinstitution.com)" {...signUpForm.register('email')} />
                  {signUpForm.formState.errors.email && <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" {...signUpForm.register('password')} />
                  {signUpForm.formState.errors.password && <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirmPassword">Confirm Password *</Label>
                  <Input id="signup-confirmPassword" type="password" placeholder="••••••••" {...signUpForm.register('confirmPassword')} />
                  {signUpForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={signUpForm.formState.isSubmitting}>
                  {signUpForm.formState.isSubmitting ? 'Creating account...' : 'Create Account & Continue to Application'}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-semibold"
                      onClick={() => navigate('/auth')}
                      type="button"
                    >
                      Sign In
                    </Button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default InstitutionAuth;