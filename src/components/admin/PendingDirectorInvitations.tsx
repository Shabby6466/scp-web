import { useState, useEffect } from "react";
import { invitationService } from "@/services/invitationService";
import { branchService } from "@/services/branchService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Trash2, RefreshCw, UserCog, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DirectorInvitation {
  id: string;
  email: string;
  full_name: string | null;
  branch_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  branch?: {
    branch_name: string;
  } | null;
}

interface PendingDirectorInvitationsProps {
  schoolId: string;
  refreshTrigger?: number;
}

export function PendingDirectorInvitations({ schoolId, refreshTrigger }: PendingDirectorInvitationsProps) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<DirectorInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, [schoolId, refreshTrigger]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await invitationService.list(schoolId);
      const pendingDirectorInvites = (data || []).filter(
        (inv: any) => inv.status === 'pending' && inv.role === 'director'
      );

      const enrichedInvitations = await Promise.all(
        pendingDirectorInvites.map(async (inv: any) => {
          try {
            const branchData = inv.branch_id ? await branchService.getById(inv.branch_id) : null;
            return { ...inv, branch: branchData };
          } catch {
            return { ...inv, branch: null };
          }
        })
      );

      setInvitations(enrichedInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      await invitationService.send({
        schoolId,
        email: invitations.find(i => i.id === invitationId)?.email || '',
        role: 'director',
      });

      toast({
        title: "Invitation resent",
        description: "The invitation email has been sent again",
      });
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (invitationId: string) => {
    setDeletingId(invitationId);
    try {
      await invitationService.revoke(invitationId);

      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed",
      });

      fetchInvitations();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete invitation",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Pending Director Invitations
        </CardTitle>
        <CardDescription>
          Invitations that have been sent but not yet accepted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const expired = isExpired(invitation.expires_at);
            return (
              <div
                key={invitation.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  expired ? "bg-muted/50 border-dashed" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {invitation.full_name || invitation.email}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {invitation.email}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {invitation.branch?.branch_name || "Unknown branch"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sent {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResend(invitation.id)}
                    disabled={resendingId === invitation.id}
                  >
                    {resendingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(invitation.id)}
                    disabled={deletingId === invitation.id}
                  >
                    {deletingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}