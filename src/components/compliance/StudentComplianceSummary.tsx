import { GraduationCap, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { AnimatedStatCard } from "@/components/ui/animated-stat-card";

interface StudentComplianceSummaryProps {
  totalStudents: number;
  compliantCount: number;
  nonCompliantCount: number;
  expiringCount: number;
}

export const StudentComplianceSummary = ({
  totalStudents,
  compliantCount,
  nonCompliantCount,
  expiringCount,
}: StudentComplianceSummaryProps) => {
  if (totalStudents === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <AnimatedStatCard
        value={totalStudents}
        label="Total Students"
        icon={GraduationCap}
        delay={0}
      />
      <AnimatedStatCard
        value={compliantCount}
        label="Compliant"
        icon={CheckCircle}
        iconColor="text-emerald-500"
        trend={totalStudents > 0 ? { value: Math.round((compliantCount / totalStudents) * 100), isPositive: true } : undefined}
        delay={100}
      />
      <AnimatedStatCard
        value={nonCompliantCount}
        label="Non-Compliant"
        icon={AlertTriangle}
        iconColor="text-destructive"
        delay={200}
      />
      <AnimatedStatCard
        value={expiringCount}
        label="Expiring Soon"
        icon={Clock}
        iconColor="text-amber-500"
        delay={300}
      />
    </div>
  );
};
