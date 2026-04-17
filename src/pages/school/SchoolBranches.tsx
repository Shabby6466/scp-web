import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { schoolService } from "@/services/schoolService";
import { branchService, type BranchWritePayload } from "@/services/branchService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchoolBranchesManager, SchoolBranch } from "@/components/admin/SchoolBranchesManager";
import { Loader2 } from "lucide-react";

/**
 * SchoolBranches — branch (campus/site) CRUD for a school.
 * Backend: `Branch` entity, `CreateBranchDto` / `UpdateBranchDto`, `POST|GET /schools/:id/branches`, `PATCH|DELETE /branches/:id`.
 * Add/remove branches: ADMIN & DIRECTOR only. Branch directors may update their assigned branch.
 */

const LoadingSpinner = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface School {
  id: string;
  state: string;
}

function branchToApiPayload(branch: SchoolBranch): BranchWritePayload {
  return {
    name: branch.branch_name.trim(),
    address: branch.address?.trim() || null,
    city: branch.city?.trim() || null,
    state: branch.state?.trim() || null,
    zipCode: branch.zip_code?.trim() || null,
    phone: branch.phone?.trim() || null,
    email: branch.email?.trim() || null,
    minAge: branch.min_age ?? null,
    maxAge: branch.max_age ?? null,
    totalCapacity: branch.total_capacity ?? null,
    isPrimary: branch.is_primary,
    notes: branch.notes?.trim() || null,
  };
}

const SchoolBranches = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    canManageSchool,
    isParent,
    isAdmin,
    isDirector,
    isBranchDirector,
    schoolId,
    loading: roleLoading,
  } = useUserRole();
  /** Matches backend: only these roles can create/delete branches. */
  const canAddOrRemoveBranches = isAdmin || isDirector;
  const [school, setSchool] = useState<School | null>(null);
  const [branches, setBranches] = useState<SchoolBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSchool = useCallback(async () => {
    if (!schoolId) return;

    try {
      const data = await schoolService.getById(schoolId);
      if (data) {
        setSchool(data);
      }
    } catch (error) {
      console.error("Error fetching school:", error);
    }
  }, [schoolId]);

  const loadBranches = useCallback(async () => {
    if (!school?.id) return;

    try {
      const data = await branchService.listBySchool(school.id);

      setBranches((data || []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        branch_name: (b.branch_name as string) || (b.branchName as string) || (b.name as string) || "",
        address: (b.address as string) || "",
        city: (b.city as string) || "",
        state: (b.state as string) || "",
        zip_code: (b.zip_code as string) || (b.zipCode as string) || "",
        phone: (b.phone as string) || "",
        email: (b.email as string) || undefined,
        min_age: (b.min_age as number) ?? (b.minAge as number) ?? undefined,
        max_age: (b.max_age as number) ?? (b.maxAge as number) ?? undefined,
        total_capacity: (b.total_capacity as number) ?? (b.totalCapacity as number) ?? undefined,
        is_primary: Boolean(b.is_primary ?? b.isPrimary),
        notes: (b.notes as string) || undefined,
      })));
    } catch (error: unknown) {
      console.error("Error loading branches:", error);
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (isParent) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!canManageSchool) {
      navigate('/not-authorized', { replace: true });
      return;
    }

    if (schoolId) {
      void fetchSchool();
    }
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate, schoolId, fetchSchool]);

  useEffect(() => {
    if (school?.id && canManageSchool) {
      void loadBranches();
    }
  }, [school?.id, canManageSchool, loadBranches]);

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user || isParent || !canManageSchool) {
    return <LoadingSpinner />;
  }

  const handleSave = async () => {
    if (!school?.id || !user) return;

    if (branches.length === 0) {
      toast.error("Please add at least one branch");
      return;
    }

    const incompleteBranches = branches.filter(b =>
      !b.branch_name || !b.address || !b.city || !b.zip_code || !b.phone
    );

    if (incompleteBranches.length > 0) {
      toast.error("Please complete all required fields for each branch");
      return;
    }

    setSaving(true);

    try {
      const existingBranches = await branchService.listBySchool(school.id);
      const existingIds = (existingBranches || []).map((b: { id: string }) => b.id);
      const currentIds = branches.filter(b => b.id).map(b => b.id!);

      const toRemove = existingIds.filter(id => !currentIds.includes(id));
      await Promise.all(toRemove.map(id => branchService.remove(id)));

      await Promise.all(
        branches.map((branch) => {
          const payload = branchToApiPayload(branch);
          if (branch.id) {
            return branchService.update(branch.id, payload);
          }
          return branchService.create(school.id, payload);
        })
      );

      toast.success("Branches saved successfully");
      loadBranches();
    } catch (error: unknown) {
      console.error("Error saving branches:", error);
      toast.error("Failed to save branches");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
        <p className="text-muted-foreground mt-1">
          Campuses or sites where your school operates. Each branch has its own address, capacity, and age range.
          {isBranchDirector && !canAddOrRemoveBranches && (
            <span className="block mt-2 text-sm">
              You can update your branch&apos;s details here. Adding or removing branches is limited to school directors and admins.
            </span>
          )}
        </p>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle>Branch list</CardTitle>
          <CardDescription>
            Required fields match the server: name, address, city, ZIP, phone, and age/capacity where applicable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <SchoolBranchesManager
            branches={branches}
            onChange={setBranches}
            defaultState={school?.state || "NY"}
            allowAddRemove={canAddOrRemoveBranches}
          />

          <div className="flex justify-end gap-3 pt-6 border-t border-border/10">
            <Button
              variant="outline"
              onClick={loadBranches}
              disabled={saving}
              className="hover:bg-muted/80"
            >
              Reset changes
            </Button>
            <Button onClick={handleSave} disabled={saving} className="px-8">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolBranches;
