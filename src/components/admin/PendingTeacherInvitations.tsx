import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { invitationService } from '@/services/invitationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronUp, Mail, RefreshCw, X, Clock, School as SchoolIcon, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface TeacherInvitation {
  id: string;
  school_id: string;
  branch_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  classroom: string | null;
  invitation_token: string;
  status: string;
  expires_at: string;
  created_at: string;
  school?: {
    name: string;
  };
  branch?: {
    branch_name: string;
  };
}

interface PendingTeacherInvitationsProps {
  onInvitationChange?: () => void;
}

const PendingTeacherInvitations = ({ onInvitationChange }: PendingTeacherInvitationsProps) => {
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const data = await invitationService.list();
      const pendingTeacherInvites = (data || []).filter(
        (inv: any) => inv.status === 'pending' && inv.role === 'teacher'
      ).map((inv: any) => ({
        ...inv,
        school: Array.isArray(inv.school) ? inv.school[0] : inv.school,
        branch: Array.isArray(inv.branch) ? inv.branch[0] : inv.branch,
      }));

      setInvitations(pendingTeacherInvites);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast({
        variant: "destructive",
        title: "Error loading invitations",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitation: TeacherInvitation) => {
    setResendingId(invitation.id);
    try {
      await invitationService.revoke(invitation.id);

      await invitationService.send({
        schoolId: invitation.school_id,
        branchId: invitation.branch_id || undefined,
        email: invitation.email,
        role: 'teacher',
      });

      toast({
        title: "Invitation resent",
        description: `Invitation email sent to ${invitation.email}`,
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resending invitation",
        description: error.message,
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      await invitationService.revoke(invitationId);

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });

      fetchInvitations();
      onInvitationChange?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error cancelling invitation",
        description: error.message,
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  const expiredCount = invitations.filter(inv => isPast(new Date(inv.expires_at))).length;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Pending Teacher Invitations</CardTitle>
                <Badge variant="secondary">{invitations.length}</Badge>
                {expiredCount > 0 && (
                  <Badge variant="destructive">{expiredCount} expired</Badge>
                )}
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => {
              const isExpired = isPast(new Date(invitation.expires_at));
              return (
                <div
                  key={invitation.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3 ${
                    isExpired ? 'border-destructive/50 bg-destructive/5' : ''
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {invitation.first_name} {invitation.last_name}
                      </span>
                      {isExpired && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{invitation.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SchoolIcon className="h-3 w-3" />
                        <span>{invitation.school?.name || 'Unknown School'}</span>
                      </div>
                      {invitation.branch && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{invitation.branch.branch_name}</span>
                        </div>
                      )}
                      {invitation.classroom && (
                        <span className="text-xs">Classroom: {invitation.classroom}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Sent {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                          {isExpired
                            ? ` • Expired ${formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}`
                            : ` • Expires ${format(new Date(invitation.expires_at), 'MMM d, yyyy')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(invitation)}
                      disabled={resendingId === invitation.id}
                    >
                      {resendingId === invitation.id ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Resend
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={cancellingId === invitation.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel the invitation for {invitation.first_name} {invitation.last_name}.
                            They will no longer be able to use the invitation link to sign up.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancel(invitation.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancel Invitation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PendingTeacherInvitations;
