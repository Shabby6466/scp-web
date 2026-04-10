import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolService } from '@/services/schoolService';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Building2, Phone, Mail, MapPin, Globe, Users } from 'lucide-react';

/**
 * SchoolSettings - School settings page
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

interface SchoolData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  website: string | null;
  min_age: number | null;
  max_age: number | null;
  total_capacity: number | null;
  license_number: string | null;
  certification_number: string | null;
}

const SchoolSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [formData, setFormData] = useState<Partial<SchoolData>>({});

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

    fetchSchoolData();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  // Don't render if not authorized
  if (!user || isParent || !canManageSchool) {
    return <LoadingSpinner />;
  }

  const fetchSchoolData = async () => {
    if (!user || !schoolId) {
      setLoading(false);
      return;
    }

    try {
      const schoolData = await schoolService.getById(schoolId);
      setSchool(schoolData);
      setFormData(schoolData);
    } catch (error) {
      console.error('Error fetching school data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load school settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!school) return;

    setSaving(true);
    try {
      await schoolService.update(school.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zip_code,
        website: formData.website,
        minAge: formData.min_age,
        maxAge: formData.max_age,
        totalCapacity: formData.total_capacity,
        licenseNumber: formData.license_number,
        certificationNumber: formData.certification_number,
      });

      toast({
        title: 'Settings saved',
        description: 'Your school settings have been updated.',
      });
    } catch (error: any) {
      console.error('Error saving school settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SchoolData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No School Found</CardTitle>
              <CardDescription>You don't have access to any school settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(-1)}>Go Back</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-display font-bold mb-2">School Settings</h1>
            <p className="text-muted-foreground">Manage your school's information and settings</p>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Your school's core details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">
                    <Globe className="h-4 w-4 inline mr-1" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://yourschool.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
                <CardDescription>Your school's address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code || ''}
                      onChange={(e) => handleChange('zip_code', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacity & Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Capacity & Compliance
                </CardTitle>
                <CardDescription>Enrollment and licensing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_capacity">Total Capacity</Label>
                    <Input
                      id="total_capacity"
                      type="number"
                      value={formData.total_capacity || ''}
                      onChange={(e) => handleChange('total_capacity', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_age">Minimum Age</Label>
                    <Input
                      id="min_age"
                      type="number"
                      value={formData.min_age || ''}
                      onChange={(e) => handleChange('min_age', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_age">Maximum Age</Label>
                    <Input
                      id="max_age"
                      type="number"
                      value={formData.max_age || ''}
                      onChange={(e) => handleChange('max_age', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license_number">License Number</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number || ''}
                      onChange={(e) => handleChange('license_number', e.target.value)}
                      placeholder="State license number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certification_number">DOH Certification Number</Label>
                    <Input
                      id="certification_number"
                      value={formData.certification_number || ''}
                      onChange={(e) => handleChange('certification_number', e.target.value)}
                      placeholder="Department of Health certification"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolSettings;
