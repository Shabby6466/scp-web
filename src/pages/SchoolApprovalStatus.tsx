import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { schoolService } from "@/services/schoolService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import type { School } from "@/types/api";

export default function SchoolApprovalStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/institution-auth");
      return;
    }

    loadSchoolStatus();
  }, [user, navigate]);

  const loadSchoolStatus = async () => {
    try {
      if (!user?.schoolId) {
        setLoading(false);
        return;
      }

      const schoolData = await schoolService.getById(user.schoolId);
      setSchool(schoolData);
    } catch (error) {
      console.error("Error loading school status:", error);
      toast.error("Failed to load application status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!school) return null;

    if (school.isApproved) {
      return (
        <Badge variant="default" className="bg-green-500 text-white">
          <CheckCircle className="w-4 h-4 mr-1" />
          Approved
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-yellow-500 text-white">
        <Clock className="w-4 h-4 mr-1" />
        Pending Review
      </Badge>
    );
  };

  const getStatusIcon = () => {
    if (!school) return <Clock className="w-16 h-16 text-muted-foreground" />;

    if (school.isApproved) {
      return <CheckCircle className="w-16 h-16 text-green-500" />;
    }

    return <Clock className="w-16 h-16 text-yellow-500" />;
  };

  const getStatusMessage = () => {
    if (!school) return "Loading application status...";

    if (school.isApproved) {
      return "Your school has been approved! You can now access your dashboard.";
    }

    return "Your application is currently under review. We'll notify you once it's been processed.";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header hideParentPortal />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header hideParentPortal />
      <main className="flex-1 pt-20 pb-12">
        <div className="container max-w-2xl px-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl">Application Status</CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription>
                {school ? `${school.name} - ${school.email}` : "Your school application"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center py-8">
                {getStatusIcon()}
                <h3 className="text-xl font-semibold mt-4 mb-2">
                  {school?.isApproved ? "Welcome to LittleLedger!" : "Application Under Review"}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {getStatusMessage()}
                </p>
              </div>

              {school?.isApproved && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Approved on: {new Date(school.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {!school?.isApproved && (
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    What happens next?
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                    <li>Our team will review your application within 1-2 business days</li>
                    <li>You'll receive an email notification once approved</li>
                    <li>After approval, you can immediately start using LittleLedger</li>
                    <li>Questions? Contact us at support@littleledger.com</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                {school?.isApproved ? (
                  <Button
                    onClick={() => navigate("/school-dashboard")}
                    className="flex-1"
                    size="lg"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/school-application")}
                      className="flex-1"
                    >
                      Edit Application
                    </Button>
                    <Button
                      onClick={loadSchoolStatus}
                      className="flex-1"
                      variant="secondary"
                    >
                      Refresh Status
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
