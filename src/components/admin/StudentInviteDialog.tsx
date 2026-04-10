import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Copy, CheckCircle } from 'lucide-react';

interface StudentInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    school_id: string | null;
  };
  onSuccess?: () => void;
}

const StudentInviteDialog = ({ isOpen, onClose, student, onSuccess }: StudentInviteDialogProps) => {
  const { user } = useAuth();
  const { branchId } = useUserRole();
  const { toast } = useToast();
  
  const [parentEmail, setParentEmail] = useState('');
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !student.school_id) return;

    setLoading(true);
    try {
      const data = await api.post('/invitations/send-parent', {
        parentEmail: parentEmail.trim(),
        schoolId: student.school_id,
        studentId: student.id,
        parentFirstName: parentFirstName.trim() || null,
        parentLastName: parentLastName.trim() || null,
        branchId: branchId || null,
      });

      setInviteLink(data.enrollmentLink);
      
      toast({
        title: 'Invitation sent!',
        description: data.emailSent 
          ? `Email sent to ${parentEmail}` 
          : 'Invitation link created successfully'
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Link copied to clipboard' });
    }
  };

  const handleClose = () => {
    setParentEmail('');
    setParentFirstName('');
    setParentLastName('');
    setInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invite Parent
          </DialogTitle>
          <DialogDescription>
            Send an enrollment invitation for <strong>{student.first_name} {student.last_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="font-medium text-success">Invitation Created!</p>
            </div>
            <div className="space-y-2">
              <Label>Enrollment Link</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the parent. It expires in 14 days.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentEmail">Parent Email *</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentFirstName">First Name</Label>
                <Input
                  id="parentFirstName"
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentLastName">Last Name</Label>
                <Input
                  id="parentLastName"
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentInviteDialog;
