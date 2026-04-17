import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Users, GraduationCap, Mail, BarChart3, 
  ChevronRight, Building2, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RosterImportWizard from "@/components/roster/RosterImportWizard";

interface ManagementHubProps {
  schoolId: string;
  schoolName?: string;
  branchId?: string | null;
  branchName?: string | null;
  stats: {
    requiredDocumentCount: number;
    staffCount: number;
    expiringStaffCount: number;
    studentCount: number;
    studentsWithMissingDocs: number;
    parentInviteCount: number;
    pendingInviteCount: number;
    acceptedInviteCount: number;
    dohCompliancePercent: number;
    facilityCompliancePercent: number;
  };
  onRefresh?: () => void;
}

const ManagementHub = ({ 
  schoolId, 
  schoolName = "Your School",
  branchId,
  branchName,
  stats,
  onRefresh
}: ManagementHubProps) => {
  const navigate = useNavigate();
  const [showRosterImport, setShowRosterImport] = useState(false);

  const cards = [
    {
      id: "required-docs",
      title: "Required Documents",
      description: "Document types parents must submit",
      icon: FileText,
      status: `${stats.requiredDocumentCount} types defined`,
      alert: null,
      primaryCta: { label: "Manage", path: "/school/student-requirements" },
    },
    {
      id: "staff",
      title: "Staff",
      description: "Teachers and administrators",
      icon: Users,
      status: `${stats.staffCount} active`,
      alert: stats.expiringStaffCount > 0 ? `${stats.expiringStaffCount} expiring` : null,
      primaryCta: { label: "Manage", path: "/school/staff" },
    },
    {
      id: "students",
      title: "Students",
      description: "Student roster and enrollment",
      icon: GraduationCap,
      status: `${stats.studentCount} enrolled`,
      alert: stats.studentsWithMissingDocs > 0 ? `${stats.studentsWithMissingDocs} missing docs` : null,
      primaryCta: { label: "Manage", path: "/school/students" },
    },
    {
      id: "invitations",
      title: "Parent Invitations",
      description: "Invite and track parent onboarding",
      icon: Mail,
      status: `${stats.acceptedInviteCount} accepted`,
      alert: stats.pendingInviteCount > 3 ? `${stats.pendingInviteCount} pending` : null,
      primaryCta: { label: "Manage", path: "/school/parents" },
    },
  ];

  const getComplianceVariant = (percent: number) => {
    if (percent >= 90) return 'success';
    if (percent >= 70) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Management Hub
          </CardTitle>
          {branchName && (
            <Badge variant="outline">
              <Building2 className="h-3 w-3 mr-1" />
              {branchName}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Management Cards - 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div 
                key={card.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => navigate(card.primaryCta.path)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{card.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{card.status}</span>
                      {card.alert && (
                        <Badge variant="warning">
                          {card.alert}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            );
          })}
        </div>

        {/* Compliance Section */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Compliance</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getComplianceVariant(stats.dohCompliancePercent)}>
                DOH: {stats.dohCompliancePercent}%
              </Badge>
              <Badge variant={getComplianceVariant(stats.facilityCompliancePercent)}>
                Facility: {stats.facilityCompliancePercent}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>

      <RosterImportWizard
        open={showRosterImport}
        onOpenChange={setShowRosterImport}
        schoolId={schoolId}
        branchId={branchId || undefined}
        onComplete={onRefresh}
      />
    </Card>
  );
};

export default ManagementHub;
