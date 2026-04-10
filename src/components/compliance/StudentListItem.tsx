import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentListItemProps {
  id: string;
  name: string;
  schoolName?: string;
  isCompliant: boolean;
  expiredDocs: number;
  expiringDocs: number;
  totalDocs: number;
  showSchool?: boolean;
  onClick: () => void;
}

export const StudentListItem = ({
  id,
  name,
  schoolName,
  isCompliant,
  expiredDocs,
  expiringDocs,
  totalDocs,
  showSchool,
  onClick,
}: StudentListItemProps) => {
  // Get initials for avatar
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
        isCompliant
          ? 'bg-card hover:bg-muted/50 border border-border/40 hover:border-border hover:shadow-sm'
          : 'bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/30 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with initials */}
        <div className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
          isCompliant 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {initials}
        </div>
        
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          {showSchool && schoolName && (
            <p className="text-xs text-muted-foreground truncate">{schoolName}</p>
          )}
          {/* Document count indicator */}
          <div className="flex items-center gap-1 mt-0.5">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{totalDocs} docs</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {expiredDocs > 0 && (
          <Badge variant="error-dot" className="text-xs">
            {expiredDocs} expired
          </Badge>
        )}
        {expiringDocs > 0 && (
          <Badge variant="warning-dot" className="text-xs">
            {expiringDocs} expiring
          </Badge>
        )}
        {isCompliant && expiringDocs === 0 && (
          <Badge variant="success-dot" className="text-xs">
            Compliant
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
};
