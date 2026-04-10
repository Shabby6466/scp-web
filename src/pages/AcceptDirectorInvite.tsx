import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { invitationService } from "@/services/invitationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, UserCog } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  school_id: string;
  branch_id: string;
  school_name?: string;
  branch_name?: string;
}

export default function AcceptDirectorInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

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
      const data = await invitationService.validate(inviteToken, 'director');

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("This invitation is invalid or has expired.");
        setLoading(false);
        return;
      }

      const inviteData = Array.isArray(data) ? data[0] : data;

      setInvitation({
        id: inviteData.id,
        email: inviteData.email,
        full_name: inviteData.full_name,
        school_id: inviteData.school_id,
        branch_id: inviteData.branch_id,
        school_name: inviteData.school_name,
        branch_name: inviteData.branch_name,
      });

      if (inviteData.full_name) {
        setFullName(inviteData.full_name);
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

    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "Please enter your full name" });
      return;
    }

    if (!invitation || !token) return;

    setSubmitting(true);

    try {
      await invitationService.accept(token, 'director', {
        fullName,
        password,
        phone: phone || null,
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
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserCog className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to LittleLedger</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invitation.school_name}</strong> as a{" "}
              <strong>Branch Director</strong> for <strong>{invitation.branch_name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pre-filled info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm"><strong>Email:</strong> {invitation.email}</p>
                <p className="text-sm"><strong>School:</strong> {invitation.school_name}</p>
                <p className="text-sm"><strong>Branch:</strong> {invitation.branch_name}</p>
              </div>

              {/* Account Setup */}
              <div className="space-y-4">
                <h3 className="font-semibold">Create Your Account</h3>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="John Smith"
                  />
                </div>
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
                <h3 className="font-semibold">Contact Information (Optional)</h3>
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Account & Join
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
