import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { branchService } from "@/services/branchService";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Trash2, Mail, Building2, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectorInviteDialog } from "@/components/admin/DirectorInviteDialog";
import { PendingDirectorInvitations } from "@/components/admin/PendingDirectorInvitations";

interface Director {
  id: string;
  user_id: string;
  school_id: string;
  branch_id: string | null;
  profile: {
    full_name: string;
    email: string;
  } | null;
  branch: {
    branch_name: string;
  } | null;
}

interface Branch {
  id: string;
  branch_name: string;
  address: string;
  city: string;
}

interface DirectorManagementProps {
  schoolId: string;
}

export function DirectorManagement({ schoolId }: DirectorManagementProps) {
  const { toast } = useToast();
  const [directors, setDirectors] = useState<Director[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [directorsData, branchesData] = await Promise.all([
        api.get(`/user-roles?schoolId=${schoolId}&role=director`),
        branchService.listBySchool(schoolId),
      ]);

      const enrichedDirectors: Director[] = (directorsData || []).map((dir: any) => ({
        id: dir.id,
        user_id: dir.user_id,
        school_id: dir.school_id,
        branch_id: dir.branch_id,
        profile: dir.profile || dir.user?.profile || null,
        branch: dir.branch || null,
      }));

      setDirectors(enrichedDirectors);
      setBranches(branchesData || []);
    } catch (error) {
      console.error('Error fetching directors:', error);
      toast({
        title: "Error",
        description: "Failed to load directors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDirector = async (directorRoleId: string) => {
    try {
      await api.delete(`/user-roles/${directorRoleId}`);

      toast({
        title: "Director removed",
        description: "The director role has been revoked",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error removing director:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove director",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBranch = async (directorRoleId: string, newBranchId: string) => {
    try {
      await api.patch(`/user-roles/${directorRoleId}`, { branch_id: newBranchId });

      toast({
        title: "Branch updated",
        description: "Director's assigned branch has been updated",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating branch:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update branch assignment",
        variant: "destructive",
      });
    }
  };

  const handleInviteSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      <PendingDirectorInvitations schoolId={schoolId} refreshTrigger={refreshTrigger} />

      {/* Current Directors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Directors
            </CardTitle>
            <CardDescription>
              Manage branch directors for your school
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Invite Director
          </Button>
        </CardHeader>
        <CardContent>
          {directors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No directors assigned</p>
              <p className="text-sm">Add directors to manage your school branches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {directors.map((director) => (
                <div
                  key={director.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {director.profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {director.profile?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={director.branch_id || ""}
                      onValueChange={(value) => handleUpdateBranch(director.id, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="No branch assigned">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {director.branch?.branch_name || 'No branch'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveDirector(director.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <DirectorInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        schoolId={schoolId}
        branches={branches}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
