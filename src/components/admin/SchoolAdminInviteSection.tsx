import { useState, useEffect } from "react";
import { invitationService } from "@/services/invitationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Send, Loader2, RefreshCw, X, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Invitation {
  id: string;
  admin_email: string;
  admin_name: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

interface SchoolAdminInviteSectionProps {
  schoolId: string;
  schoolName: string;
  isApproved: boolean;
}

export function SchoolAdminInviteSection({ schoolId, schoolName, isApproved }: SchoolAdminInviteSectionProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    loadInvitations();
  }, [schoolId]);

  const loadInvitations = async () => {
    try {
      const data = await invitationService.list(schoolId);
      setInvitations(data || []);
    } catch (error) {
      console.error("Error loading invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      await invitationService.send({
        schoolId,
        email: email.trim(),
        role: 'SCHOOL_ADMIN',
      });

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setName("");
      loadInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (invitation: Invitation) => {
    setSending(true);
    try {
      await invitationService.revoke(invitation.id);

      await invitationService.send({
        schoolId,
        email: invitation.admin_email,
        role: 'SCHOOL_ADMIN',
      });

      toast.success(`Invitation resent to ${invitation.admin_email}`);
      loadInvitations();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (invitation: Invitation) => {
    try {
      await invitationService.revoke(invitation.id);
      toast.success("Invitation cancelled");
      loadInvitations();
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();

    if (status === "accepted") {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (!isApproved) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invite School Administrator
        </CardTitle>
        <CardDescription>
          Send an invitation to the person who will manage {schoolName} on SCP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invitation Form */}
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email Address *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Name (optional)</Label>
              <Input
                id="adminName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
          </div>
          <Button type="submit" disabled={sending || !email.trim()}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </form>

        {/* Invitations List */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : invitations.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Sent Invitations</h4>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{invitation.admin_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent {format(new Date(invitation.created_at), "MMM d, yyyy")}
                      {invitation.admin_name && ` • ${invitation.admin_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusBadge(invitation.status, invitation.expires_at)}
                    {invitation.status === "pending" && new Date(invitation.expires_at) > new Date() && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResend(invitation)}
                          disabled={sending}
                          title="Resend invitation"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(invitation)}
                          title="Cancel invitation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
