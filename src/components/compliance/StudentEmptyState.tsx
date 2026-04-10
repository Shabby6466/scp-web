import { GraduationCap, Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentEmptyStateProps {
  onImportRoster: () => void;
  onInviteParent: () => void;
  searchActive?: boolean;
}

export const StudentEmptyState = ({ 
  onImportRoster, 
  onInviteParent,
  searchActive 
}: StudentEmptyStateProps) => {
  if (searchActive) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No matching students</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Try adjusting your search terms or clear the search to see all students.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-16 text-center overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-lg" />
      <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute bottom-4 left-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      
      {/* Icon with animation */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-6 ring-1 ring-primary/20">
          <GraduationCap className="h-12 w-12 text-primary" />
        </div>
      </div>
      
      {/* Content */}
      <h3 className="text-xl font-semibold mb-2 relative">
        No students enrolled yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-8 relative">
        Import your student roster from a spreadsheet or add students individually to start tracking compliance.
      </p>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 relative">
        <Button 
          variant="premium" 
          size="lg" 
          onClick={onImportRoster}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Roster
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          onClick={onInviteParent}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite Parent
        </Button>
      </div>
    </div>
  );
};
