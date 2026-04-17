import { useNavigate } from "react-router-dom";
import { Check, Upload, Users, GraduationCap, Mail, BarChart3, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSchoolSetupStatus } from "@/hooks/useSchoolSetupStatus";
import ManagementHub from "./ManagementHub";

interface SchoolSetupWizardProps {
  schoolId: string;
  schoolName?: string;
  branchId?: string | null;
  branchName?: string | null;
  onDismiss?: () => void;
}

const SchoolSetupWizard = ({ 
  schoolId, 
  schoolName = "your school", 
  branchId,
  branchName,
  onDismiss 
}: SchoolSetupWizardProps) => {
  const navigate = useNavigate();
  const setupStatus = useSchoolSetupStatus(schoolId, branchId);

  const steps = [
    {
      id: 1,
      title: "Upload Required Documents",
      description: "Define which documents parents must submit",
      icon: Upload,
      path: "/school/student-requirements",
      isComplete: setupStatus.hasRequiredDocuments,
      count: setupStatus.requiredDocumentCount,
      threshold: 3,
      countLabel: "document types defined",
    },
    {
      id: 2,
      title: "Add Your Staff",
      description: "Invite teachers and administrators",
      icon: Users,
      path: "/school/staff",
      isComplete: setupStatus.hasStaff,
      count: setupStatus.staffCount,
      threshold: 1,
      countLabel: "staff members",
    },
    {
      id: 3,
      title: "Add Your Students",
      description: "Import your student roster",
      icon: GraduationCap,
      path: "/school/students",
      isComplete: setupStatus.hasStudents,
      count: setupStatus.studentCount,
      threshold: 1,
      countLabel: "students enrolled",
    },
    {
      id: 4,
      title: "Send Parent Invitations",
      description: "Invite parents to upload documents",
      icon: Mail,
      path: "/school/parents",
      isComplete: setupStatus.hasSentParentInvites,
      count: setupStatus.parentInviteCount,
      threshold: 1,
      countLabel: "invitations sent",
    },
    {
      id: 5,
      title: "Monitor Compliance",
      description: "Track document status and send reminders",
      icon: BarChart3,
      path: "/compliance",
      isComplete: setupStatus.hasComplianceActivity,
      count: setupStatus.approvedDocumentCount,
      threshold: 1,
      countLabel: "documents approved",
    },
  ];

  const getStepStatus = (step: typeof steps[0]) => {
    if (step.isComplete) return "completed";
    if (step.count > 0) return "in-progress";
    return "not-started";
  };

  const getStatusBadge = (step: typeof steps[0]) => {
    const status = getStepStatus(step);
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Started</Badge>;
    }
  };

  if (setupStatus.loading) {
    return (
      <Card className="w-full border-2 border-primary/20 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading setup status...</span>
        </CardContent>
      </Card>
    );
  }

  // When setup is complete, show Management Hub instead of checklist
  if (setupStatus.isComplete) {
    return (
      <ManagementHub
        schoolId={schoolId}
        schoolName={schoolName}
        branchId={branchId}
        branchName={branchName}
        stats={{
          requiredDocumentCount: setupStatus.requiredDocumentCount,
          staffCount: setupStatus.staffCount,
          expiringStaffCount: setupStatus.expiringStaffCount,
          studentCount: setupStatus.studentCount,
          studentsWithMissingDocs: setupStatus.studentsWithMissingDocs,
          parentInviteCount: setupStatus.parentInviteCount,
          pendingInviteCount: setupStatus.pendingInviteCount,
          acceptedInviteCount: setupStatus.acceptedInviteCount,
          dohCompliancePercent: setupStatus.dohCompliancePercent,
          facilityCompliancePercent: setupStatus.facilityCompliancePercent,
        }}
        onRefresh={setupStatus.refetch}
      />
    );
  }

  // Show onboarding checklist when setup is incomplete
  return (
    <Card className="w-full border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-display">
          Welcome to {schoolName}!
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Let's get your school set up in 5 simple steps
        </CardDescription>
        <div className="mt-6 max-w-md mx-auto">
          <Progress value={setupStatus.progress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {setupStatus.completedSteps} of 5 steps completed
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-6">
        {steps.map((step) => {
          const Icon = step.icon;
          const status = getStepStatus(step);

          return (
            <Card 
              key={step.id} 
              className={`border transition-all duration-200 cursor-pointer hover:shadow-md ${
                status === "completed" 
                  ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" 
                  : status === "in-progress"
                  ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => navigate(step.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div 
                    className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 ${
                      status === "completed" 
                        ? "bg-green-100 text-green-600" 
                        : status === "in-progress"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {status === "completed" ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                      {getStatusBadge(step)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                    {step.count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.count} {step.countLabel}
                        {!step.isComplete && step.count < step.threshold && (
                          <span className="text-amber-600 ml-1">
                            (need {step.threshold - step.count} more)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    variant={status === "completed" ? "ghost" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(step.path);
                    }}
                  >
                    {status === "completed" ? "View" : status === "in-progress" ? "Continue" : "Start"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SchoolSetupWizard;
