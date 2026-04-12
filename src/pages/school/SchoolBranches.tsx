import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { schoolService } from "@/services/schoolService";
import { branchService } from "@/services/branchService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchoolBranchesManager, SchoolBranch } from "@/components/admin/SchoolBranchesManager";
import { Loader2, ArrowLeft } from "lucide-react";

/**
 * SchoolBranches - School locations/branches management
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

interface School {
  id: string;
  state: string;
}

const SchoolBranches = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const [school, setSchool] = useState<School | null>(null);
  const [branches, setBranches] = useState<SchoolBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    // Fetch the school data for non-parent users
    if (schoolId) {
      fetchSchool();
    }
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate, schoolId]);

  const fetchSchool = async () => {
    if (!schoolId) return;
    
    try {
      const data = await schoolService.getById(schoolId);
      if (data) {
        setSchool(data);
      }
    } catch (error) {
      console.error("Error fetching school:", error);
    }
  };

  useEffect(() => {
    if (school?.id && canManageSchool) {
      loadBranches();
    }
  }, [school?.id, canManageSchool]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  // Don't render if not authorized
  if (!user || isParent || !canManageSchool) {
    return <LoadingSpinner />;
  }

  const loadBranches = async () => {
    if (!school?.id) return;

    try {
      const data = await branchService.listBySchool(school.id);

      setBranches((data || []).map((b: any) => ({
        id: b.id,
        branch_name: b.branch_name || b.branchName,
        address: b.address,
        city: b.city,
        state: b.state,
        zip_code: b.zip_code || b.zipCode,
        phone: b.phone,
        email: b.email || undefined,
        min_age: b.min_age ?? b.minAge ?? undefined,
        max_age: b.max_age ?? b.maxAge ?? undefined,
        total_capacity: b.total_capacity ?? b.totalCapacity ?? undefined,
        is_primary: b.is_primary ?? b.isPrimary,
        notes: b.notes || undefined,
      })));
    } catch (error: any) {
      console.error("Error loading branches:", error);
      toast.error("Failed to load school locations");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!school?.id || !user) return;

    // Validation
    if (branches.length === 0) {
      toast.error("Please add at least one location");
      return;
    }

    const incompleteBranches = branches.filter(b => 
      !b.branch_name || !b.address || !b.city || !b.zip_code || !b.phone
    );
    
    if (incompleteBranches.length > 0) {
      toast.error("Please complete all required fields for each location");
      return;
    }

    setSaving(true);

    try {
      const existingBranches = await branchService.listBySchool(school.id);
      const existingIds = (existingBranches || []).map((b: any) => b.id);
      const currentIds = branches.filter(b => b.id).map(b => b.id!);
      
      // 1. Branches to remove (only those that were there but are not anymore)
      const toRemove = existingIds.filter(id => !currentIds.includes(id));
      await Promise.all(toRemove.map(id => branchService.remove(id)));

      // 2. Branches to create or update
      await Promise.all(
        branches.map(branch => {
          const payload = {
            branchName: branch.branch_name,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            zipCode: branch.zip_code,
            phone: branch.phone,
            email: branch.email || null,
            minAge: branch.min_age,
            maxAge: branch.max_age,
            totalCapacity: branch.total_capacity,
            isPrimary: branch.is_primary,
            notes: branch.notes || null,
          };

          if (branch.id) {
            return branchService.update(branch.id, payload);
          } else {
            return branchService.create({ 
              schoolId: school.id, 
              ...payload 
            });
          }
        })
      );

      toast.success("School locations updated successfully");
      loadBranches();
    } catch (error: any) {
      console.error("Error saving branches:", error);
      toast.error("Failed to save school locations");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 pb-12">
          <div className="container px-4 max-w-4xl flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container px-4 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 hover:bg-muted/80">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-4xl font-display font-bold mb-2 tracking-tight">Manage Locations</h1>
            <p className="text-muted-foreground text-lg">Add and manage your school's physical campuses and branches</p>
          </div>

          <Card className="backdrop-blur-md bg-white/60 dark:bg-black/40 border-border/40 overflow-hidden">
            <CardHeader className="border-b border-border/10 bg-muted/30">
              <CardTitle>School Locations & Branches</CardTitle>
              <CardDescription>
                Define your organizational structure. Each location can have specific age ranges and student capacities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <SchoolBranchesManager 
                branches={branches} 
                onChange={setBranches}
                defaultState={school?.state || "NY"}
              />

              <div className="flex justify-end gap-3 pt-6 border-t border-border/10">
                <Button
                  variant="outline"
                  onClick={loadBranches}
                  disabled={saving}
                  className="hover:bg-muted/80"
                >
                  Reset Changes
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolBranches;
