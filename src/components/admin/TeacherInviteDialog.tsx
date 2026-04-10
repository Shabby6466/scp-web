import { useState, useEffect } from "react";
import { schoolService } from "@/services/schoolService";
import { branchService } from "@/services/branchService";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Mail } from "lucide-react";

interface School {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  branch_name: string;
  school_id: string;
}

interface TeacherInviteDialogProps {
  schoolId?: string;
  branchId?: string;
  onInviteSent?: () => void;
}

export default function TeacherInviteDialog({ schoolId: propSchoolId, branchId: propBranchId, onInviteSent }: TeacherInviteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedSchoolId, setSelectedSchoolId] = useState(propSchoolId || "");
  const [selectedBranchId, setSelectedBranchId] = useState(propBranchId || "");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classroom, setClassroom] = useState("");

  useEffect(() => {
    if (open) {
      fetchSchools();
    }
  }, [open]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchBranches(selectedSchoolId);
    } else {
      setBranches([]);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (propSchoolId) {
      setSelectedSchoolId(propSchoolId);
    }
  }, [propSchoolId]);

  const fetchSchools = async () => {
    try {
      const data = await schoolService.list();
      const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
      setSchools(list);
    } catch {
      // silently fail
    }
  };

  const fetchBranches = async (schoolId: string) => {
    try {
      const data = await branchService.listBySchool(schoolId);
      const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
      setBranches(list);
    } catch {
      setBranches([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !firstName || !lastName || !selectedSchoolId) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }

    setLoading(true);

    try {
      await api.post('/invitations/send-teacher', {
        schoolId: selectedSchoolId,
        branchId: selectedBranchId || null,
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        classroom: classroom.trim() || null,
        createdBy: user?.id,
      });

      toast({
        title: "Invitation sent!",
        description: `An invitation email has been sent to ${email}`,
      });

      setEmail("");
      setFirstName("");
      setLastName("");
      setClassroom("");
      setSelectedBranchId("");
      if (!propSchoolId) setSelectedSchoolId("");
      setOpen(false);
      onInviteSent?.();
    } catch (err: any) {
      console.error("Error sending invitation:", err);
      toast({
        variant: "destructive",
        title: "Failed to send invitation",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Teacher</DialogTitle>
          <DialogDescription>
            Send an invitation email to a new teacher. They'll complete their profile when they accept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!propSchoolId && (
            <div className="space-y-2">
              <Label htmlFor="school">School *</Label>
              <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {branches.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="branch">Location</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classroom">Classroom</Label>
            <Input
              id="classroom"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="e.g., Room 101, Toddlers A"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
