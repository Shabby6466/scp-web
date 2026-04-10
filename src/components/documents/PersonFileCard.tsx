import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PersonFileCardProps {
  id: string;
  firstName: string;
  lastName: string;
  type: "student" | "teacher";
  documentCount: number;
  requiredCount: number;
  onClick: () => void;
}

export function PersonFileCard({
  firstName,
  lastName,
  type,
  documentCount,
  requiredCount,
  onClick,
}: PersonFileCardProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`;
  const isComplete = documentCount >= requiredCount && requiredCount > 0;
  const missingCount = Math.max(0, requiredCount - documentCount);

  const getStatusInfo = () => {
    if (requiredCount === 0) {
      return {
        icon: Clock,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        label: "No requirements",
      };
    }
    if (isComplete) {
      return {
        icon: CheckCircle2,
        color: "text-green-600",
        bgColor: "bg-green-500/10",
        label: "Complete",
      };
    }
    if (documentCount === 0) {
      return {
        icon: AlertCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        label: `${missingCount} missing`,
      };
    }
    return {
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      label: `${missingCount} missing`,
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center p-4 rounded-xl border border-border/40 bg-card",
        "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
        "transition-all duration-200 cursor-pointer text-center w-full"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 mb-3 ring-2 ring-background group-hover:ring-primary/20 transition-all">
        <AvatarFallback
          className={cn(
            "text-sm font-medium",
            type === "student"
              ? "bg-blue-500/10 text-blue-600"
              : "bg-purple-500/10 text-purple-600"
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <p className="font-medium text-sm text-foreground truncate w-full mb-1">
        {fullName}
      </p>

      {/* Document count */}
      <p className="text-xs text-muted-foreground mb-2">
        {documentCount} of {requiredCount} docs
      </p>

      {/* Status badge */}
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          status.bgColor,
          status.color
        )}
      >
        <StatusIcon className="h-3 w-3" />
        <span>{status.label}</span>
      </div>
    </button>
  );
}
