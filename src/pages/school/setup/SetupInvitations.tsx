import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invitationService } from "@/services/invitationService";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle, Send, Copy, Loader2, Users, Zap, AlertCircle } from "lucide-react";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface Invitation {
  id: string;
  parent_email: string;
  status: string;
  created_at: string;
  invitation_token: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_id: string;
}

interface ParentProfile {
  id: string;
  email: string;
  full_name: string;
}

const SetupInvitations = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parentProfiles, setParentProfiles] = useState<ParentProfile[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (isParent) { navigate('/dashboard', { replace: true }); return; }
    if (!canManageSchool) { navigate('/not-authorized', { replace: true }); return; }
    
    fetchData();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate]);

  const fetchData = async () => {
    if (!schoolId) {
      navigate('/school-register');
      return;
    }

    try {
      const [invitationsData, studentsData] = await Promise.all([
        invitationService.list(schoolId),
        userService.listStudents(schoolId),
      ]);

      setInvitations(invitationsData || []);
      setStudents(studentsData || []);

      if (studentsData && studentsData.length > 0) {
        const parentIds = [...new Set(studentsData.map((s: any) => s.parent_id))];
        const profilePromises = parentIds.map((id: string) => userService.getById(id).catch(() => null));
        const profiles = (await Promise.all(profilePromises)).filter(Boolean);
        setParentProfiles(profiles);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !parentEmail.trim()) return;

    setSending(true);
    try {
      await invitationService.send({
        schoolId,
        email: parentEmail.trim(),
        role: 'PARENT',
      });

      toast({
        title: "Invitation sent!",
        description: `Enrollment link sent to ${parentEmail}`,
      });

      setParentEmail("");
      fetchData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleBulkSend = async () => {
    if (!schoolId) return;
    
    // Parse bulk emails (comma, newline, or space separated)
    const emails = bulkEmails
      .split(/[,\n\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@'));
    
    if (emails.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }

    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of emails) {
      try {
        await invitationService.send({ schoolId, email, role: 'PARENT' });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    toast({
      title: "Bulk invitations sent",
      description: `${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
    });

    setBulkEmails("");
    setBulkSending(false);
    fetchData();
  };

  const handleSendToSelected = async () => {
    if (!schoolId || selectedEmails.size === 0) return;

    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of selectedEmails) {
      try {
        await invitationService.send({ schoolId, email, role: 'PARENT' });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    toast({
      title: "Invitations sent",
      description: `${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
    });

    setSelectedEmails(new Set());
    setBulkSending(false);
    fetchData();
  };

  const toggleEmailSelection = (email: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  const selectAllUninvited = () => {
    const invitedEmails = new Set(invitations.map(i => i.parent_email.toLowerCase()));
    const uninvitedEmails = parentProfiles
      .filter(p => !invitedEmails.has(p.email.toLowerCase()))
      .map(p => p.email);
    setSelectedEmails(new Set(uninvitedEmails));
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Invitation link copied to clipboard",
    });
  };

  if (authLoading || roleLoading || loading) {
    return <LoadingSpinner />;
  }

  const isComplete = invitations.length >= 1;
  const pendingInvites = invitations.filter(i => i.status === 'pending');
  const acceptedInvites = invitations.filter(i => i.status === 'accepted');
  
  // Find parent emails that haven't been invited yet
  const invitedEmails = new Set(invitations.map(i => i.parent_email.toLowerCase()));
  const uninvitedParents = parentProfiles.filter(p => !invitedEmails.has(p.email.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container px-4 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/school-dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              Send Parent Invitations
            </h1>
            <p className="text-muted-foreground">
              Invite parents to create accounts and upload documents.
              {isComplete && (
                <Badge className="ml-2 bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Step Complete
                </Badge>
              )}
            </p>
          </div>

          {/* Quick Bulk Invite for Uninvited Parents */}
          {uninvitedParents.length > 0 && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Invite Parents
                </CardTitle>
                <CardDescription>
                  {uninvitedParents.length} parent(s) from your student roster haven't been invited yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uninvitedParents.map(parent => {
                    const isSelected = selectedEmails.has(parent.email);
                    const studentNames = students
                      .filter(s => s.parent_id === parent.id)
                      .map(s => `${s.first_name} ${s.last_name}`)
                      .join(', ');
                    
                    return (
                      <div 
                        key={parent.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleEmailSelection(parent.email)}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{parent.email}</p>
                          {studentNames && (
                            <p className="text-xs text-muted-foreground">
                              Parent of: {studentNames}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={selectAllUninvited}
                  >
                    Select All
                  </Button>
                  <Button 
                    onClick={handleSendToSelected}
                    disabled={selectedEmails.size === 0 || bulkSending}
                    className="ml-auto"
                  >
                    {bulkSending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send {selectedEmails.size > 0 ? `(${selectedEmails.size})` : ''} Invitations
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students without invites notice */}
          {students.length > 0 && uninvitedParents.length === 0 && invitations.length < students.length && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      All known parent emails have been invited
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      You can manually enter additional parent emails below.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Invitation - Single */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Send Invitation
              </CardTitle>
              <CardDescription>
                Enter parent email addresses to send enrollment invitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSendInvitation} className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="parentEmail" className="sr-only">Parent Email</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder="parent@example.com"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    disabled={sending}
                    required
                    className="h-11"
                  />
                </div>
                <Button type="submit" disabled={sending} className="h-11">
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle bulk mode */}
              <div className="pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowBulkMode(!showBulkMode)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showBulkMode ? 'Hide' : 'Show'} Bulk Entry
                </Button>
              </div>

              {showBulkMode && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label htmlFor="bulkEmails">Bulk Email Entry</Label>
                  <Textarea
                    id="bulkEmails"
                    placeholder="Enter multiple emails separated by commas or new lines:&#10;parent1@example.com&#10;parent2@example.com&#10;parent3@example.com"
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    rows={5}
                    disabled={bulkSending}
                  />
                  <Button 
                    onClick={handleBulkSend} 
                    disabled={!bulkEmails.trim() || bulkSending}
                  >
                    {bulkSending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Bulk Invitations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitation List */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Invitations ({invitations.length})</CardTitle>
              <CardDescription>
                {pendingInvites.length} pending · {acceptedInvites.length} accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No invitations sent yet
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invitations.map(invite => (
                    <div 
                      key={invite.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        invite.status === 'accepted' 
                          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200' 
                          : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{invite.parent_email}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={invite.status === 'accepted' ? 'default' : 'outline'}>
                          {invite.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {invite.status}
                        </Badge>
                        {invite.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyInviteLink(invite.invitation_token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => navigate('/school/setup/students')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => navigate('/compliance')}>
              Continue to Compliance
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupInvitations;
