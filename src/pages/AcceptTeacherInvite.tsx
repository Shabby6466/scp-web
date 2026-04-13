import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { invitationService } from "@/services/invitationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface Invitation {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  branch_id: string | null;
  classroom: string | null;
  school_name?: string;
  branch_name?: string;
  email?: string;
}

export default function AcceptTeacherInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [certType, setCertType] = useState("");
  const [certExpiry, setCertExpiry] = useState("");
  const [bgCheckDate, setBgCheckDate] = useState("");
  const [bgCheckExpiry, setBgCheckExpiry] = useState("");
  const [hireDate, setHireDate] = useState("");

  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setError("No invitation token provided");
      setLoading(false);
    }
  }, [token]);

  const validateToken = async (inviteToken: string) => {
    try {
      const data = await invitationService.validate(inviteToken, 'teacher');

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("This invitation is invalid or has expired.");
        setLoading(false);
        return;
      }

      const inviteData = Array.isArray(data) ? data[0] : data;

      setInvitation({
        id: inviteData.id,
        first_name: inviteData.first_name,
        last_name: inviteData.last_name,
        school_id: inviteData.school_id,
        branch_id: inviteData.branch_id,
        classroom: inviteData.classroom,
        school_name: inviteData.school_name,
        branch_name: inviteData.branch_name,
        email: inviteData.email,
      });

      if (inviteData.email) {
        setInvitationEmail(inviteData.email);
      }
    } catch (err: any) {
      console.error("Error validating token:", err);
      setError("Failed to validate invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" });
      return;
    }

    if (!invitation || !invitationEmail || !token) return;

    setSubmitting(true);

    try {
      await invitationService.accept(token, 'teacher', {
        password,
        phone: phone || null,
        certType: certType || null,
        certExpiry: certExpiry || null,
        bgCheckDate: bgCheckDate || null,
        bgCheckExpiry: bgCheckExpiry || null,
        hireDate: hireDate || null,
      });

      toast({
        title: "Account created successfully!",
        description: "Please check your email to confirm your account.",
      });

      setTimeout(() => navigate("/auth"), 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        variant: "destructive",
        title: "Failed to create account",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Welcome to Compli-ed</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invitation.school_name}</strong> as a staff member.
              Complete your profile below to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pre-filled info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm"><strong>Name:</strong> {invitation.first_name} {invitation.last_name}</p>
                <p className="text-sm"><strong>Email:</strong> {invitationEmail}</p>
                {invitation.branch_name && (
                  <p className="text-sm"><strong>Location:</strong> {invitation.branch_name}</p>
                )}
                {invitation.classroom && (
                  <p className="text-sm"><strong>Classroom:</strong> {invitation.classroom}</p>
                )}
              </div>

              {/* Account Setup */}
              <div className="space-y-4">
                <h3 className="font-semibold">Account Setup</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">Contact Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-4">
                <h3 className="font-semibold">Certifications & Background Check</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="certType">Certification Type</Label>
                    <Input
                      id="certType"
                      value={certType}
                      onChange={(e) => setCertType(e.target.value)}
                      placeholder="e.g., CDA, Teaching License"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certExpiry">Certification Expiry</Label>
                    <Input
                      id="certExpiry"
                      type="date"
                      value={certExpiry}
                      onChange={(e) => setCertExpiry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bgCheckDate">Background Check Date</Label>
                    <Input
                      id="bgCheckDate"
                      type="date"
                      value={bgCheckDate}
                      onChange={(e) => setBgCheckDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bgCheckExpiry">Background Check Expiry</Label>
                    <Input
                      id="bgCheckExpiry"
                      type="date"
                      value={bgCheckExpiry}
                      onChange={(e) => setBgCheckExpiry(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Employment */}
              <div className="space-y-4">
                <h3 className="font-semibold">Employment</h3>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account & Join"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
