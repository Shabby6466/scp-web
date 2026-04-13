import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { studentParentService } from '@/services/studentParentService';
import { userService } from '@/services/userService';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  UserPlus,
  Phone as PhoneIcon,
  AlertTriangle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Baby,
  School,
} from 'lucide-react';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  phone: z.string().trim().max(20).optional(),
});

const studentSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gradeLevel: z.string().trim().max(50).optional(),
  schoolName: z.string().trim().max(200).optional(),
  allergies: z.string().trim().max(500).optional(),
  medications: z.string().trim().max(500).optional(),
  medicalConditions: z.string().trim().max(500).optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  relationship: z.string().trim().min(1, 'Relationship is required').max(50),
  phone: z.string().trim().min(1, 'Phone is required').max(20),
  email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type StudentFormData = z.infer<typeof studentSchema>;
type EmergencyContactFormData = z.infer<typeof emergencyContactSchema>;

const ParentOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isParent, getDashboardPath } = useUserRole();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const studentForm = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gradeLevel: '',
      schoolName: '',
      allergies: '',
      medications: '',
      medicalConditions: '',
    },
  });

  const emergencyContactForm = useForm<EmergencyContactFormData>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
    },
  });

  const checkOnboardingStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];
      if (list.length > 0) {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error checking onboarding status:', error);
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isParent) {
      navigate(getDashboardPath(), { replace: true });
      return;
    }
    checkOnboardingStatus();
  }, [user, authLoading, roleLoading, isParent, getDashboardPath, navigate, checkOnboardingStatus]);

  useEffect(() => {
    if (user?.name || user?.phone) {
      profileForm.reset({
        fullName: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user?.name, user?.phone, profileForm]);

  const handleProfileSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      await userService.update(user.id, {
        name: data.fullName,
        phone: data.phone?.trim() ? data.phone.trim() : '',
      });
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Profile update failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (data: StudentFormData) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const created = await api.post<{ id: string }>('/students', {
        parentId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gradeLevel: data.gradeLevel || null,
        schoolName: data.schoolName || null,
      });

      setStudentId(created?.id ?? null);

      toast({
        title: 'Student added!',
        description: `${data.firstName} ${data.lastName} has been registered.`,
      });

      setCurrentStep(3);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Student registration failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyContactSubmit = async (_data: EmergencyContactFormData) => {
    if (!user || !studentId) return;

    setLoading(true);
    try {
      toast({
        title: 'Emergency contact saved!',
        description: 'Your setup is complete.',
      });

      setCurrentStep(4);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to save emergency contact',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipEmergencyContact = () => {
    setCurrentStep(4);
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  const progress = (currentStep / 4) * 100;

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !isParent) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 pb-12 bg-gradient-to-b from-background to-muted">
        <div className="container px-4 max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-muted-foreground">Setup Progress</h2>
              <span className="text-sm font-medium">{currentStep} of 4</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {currentStep === 1 && (
            <div className="text-center mb-8">
              <h1 className="text-4xl font-display font-bold mb-4">Welcome to Compli-ed!</h1>
              <p className="text-lg text-muted-foreground">Let's get you set up in just a few steps</p>
            </div>
          )}

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Complete Your Profile
                </CardTitle>
                <CardDescription>Help us personalize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" {...profileForm.register('fullName')} placeholder="John Doe" />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input id="phone" {...profileForm.register('phone')} placeholder="(555) 123-4567" type="tel" />
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      'Saving...'
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Add Your Child
                </CardTitle>
                <CardDescription>Provide your child's information to get started with document uploads</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={studentForm.handleSubmit(handleStudentSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" {...studentForm.register('firstName')} placeholder="Emma" />
                      {studentForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">{studentForm.formState.errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" {...studentForm.register('lastName')} placeholder="Smith" />
                      {studentForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">{studentForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input id="dateOfBirth" type="date" {...studentForm.register('dateOfBirth')} />
                    {studentForm.formState.errors.dateOfBirth && (
                      <p className="text-sm text-destructive">{studentForm.formState.errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gradeLevel">Grade Level (Optional)</Label>
                      <Input id="gradeLevel" {...studentForm.register('gradeLevel')} placeholder="Pre-K, Kindergarten" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolName">
                        <School className="h-4 w-4 inline mr-1" />
                        School Name (Optional)
                      </Label>
                      <Input id="schoolName" {...studentForm.register('schoolName')} placeholder="Sunshine Preschool" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Medical Information (Optional)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This information helps schools prepare for your child's needs
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="allergies">Allergies</Label>
                      <Textarea
                        id="allergies"
                        {...studentForm.register('allergies')}
                        placeholder="e.g., Peanuts, Dairy, Pollen"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medications">Current Medications</Label>
                      <Textarea
                        id="medications"
                        {...studentForm.register('medications')}
                        placeholder="e.g., Albuterol inhaler as needed"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medicalConditions">Medical Conditions</Label>
                      <Textarea
                        id="medicalConditions"
                        {...studentForm.register('medicalConditions')}
                        placeholder="e.g., Asthma, Diabetes"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} disabled={loading}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? (
                        'Adding...'
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneIcon className="h-5 w-5" />
                  Add Emergency Contact
                </CardTitle>
                <CardDescription>
                  Provide an emergency contact for your child (optional, can be added later)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={emergencyContactForm.handleSubmit(handleEmergencyContactSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input id="contactName" {...emergencyContactForm.register('name')} placeholder="Jane Doe" />
                    {emergencyContactForm.formState.errors.name && (
                      <p className="text-sm text-destructive">{emergencyContactForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship *</Label>
                      <Input
                        id="relationship"
                        {...emergencyContactForm.register('relationship')}
                        placeholder="Grandmother, Uncle"
                      />
                      {emergencyContactForm.formState.errors.relationship && (
                        <p className="text-sm text-destructive">
                          {emergencyContactForm.formState.errors.relationship.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone Number *</Label>
                      <Input id="contactPhone" {...emergencyContactForm.register('phone')} placeholder="(555) 123-4567" type="tel" />
                      {emergencyContactForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">{emergencyContactForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email (Optional)</Label>
                    <Input id="contactEmail" {...emergencyContactForm.register('email')} placeholder="jane@example.com" type="email" />
                    {emergencyContactForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{emergencyContactForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} disabled={loading}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleSkipEmergencyContact} disabled={loading}>
                      Skip
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? (
                        'Saving...'
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card className="border-2 border-primary">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-primary-foreground" />
                  </div>

                  <div>
                    <h2 className="text-3xl font-display font-bold mb-2">Setup Complete!</h2>
                    <p className="text-muted-foreground">Your account is ready. Here's what you can do next:</p>
                  </div>

                  <div className="grid gap-4 text-left max-w-md mx-auto">
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Upload Documents</h3>
                        <p className="text-sm text-muted-foreground">Start uploading required documents for your child</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Track Progress</h3>
                        <p className="text-sm text-muted-foreground">Monitor document approval status and completion</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <UserPlus className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Add More Children</h3>
                        <p className="text-sm text-muted-foreground">You can add additional children anytime from your dashboard</p>
                      </div>
                    </div>
                  </div>

                  <Button size="lg" onClick={handleFinish} className="mt-6">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ParentOnboarding;
