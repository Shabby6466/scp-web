import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp } from 'lucide-react';
import { mapStudentFromParentLink } from '@/lib/nestMappers';

interface ProgressBarProps {
  refreshTrigger: number;
}

const ProgressBar = ({ refreshTrigger }: ProgressBarProps) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalRequired, setTotalRequired] = useState(0);

  useEffect(() => {
    if (user) {
      void fetchProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshTrigger
  }, [user, refreshTrigger]);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];
      const students = list
        .map((l: unknown) => mapStudentFromParentLink(l as Parameters<typeof mapStudentFromParentLink>[0], user.id))
        .filter(Boolean) as { id: string }[];

      if (students.length === 0) {
        setProgress(0);
        setCompletedCount(0);
        setTotalRequired(0);
        return;
      }

      let assigned = 0;
      let verified = 0;

      for (const s of students) {
        try {
          const summary = (await documentService.getSummary(s.id)) as {
            assignedCount?: number;
            items?: { latestDocument?: { verifiedAt?: string | null } | null }[];
          };
          const items = summary?.items ?? [];
          const ac = typeof summary?.assignedCount === 'number' ? summary.assignedCount : items.length;
          assigned += Math.max(0, ac);
          verified += items.filter((i) => i.latestDocument?.verifiedAt).length;
        } catch {
          /* skip */
        }
      }

      const percentage = assigned > 0 ? Math.round((verified / assigned) * 100) : 0;
      setProgress(percentage);
      setCompletedCount(verified);
      setTotalRequired(assigned);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Progress</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalRequired} required slots verified
              </p>
            </div>
          </div>
          <Badge variant={progress === 100 ? 'default' : 'secondary'} className="text-xs">
            {progress}%
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          <span>Based on forms your school assigned to each child</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressBar;
