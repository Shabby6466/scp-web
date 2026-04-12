import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { studentParentService } from '@/services/studentParentService';
import { mapStudentFromParentLink } from '@/lib/nestMappers';

interface SummaryItem {
  documentType: { id: string; name?: string };
  latestDocument: { verifiedAt?: string | null; expiresAt?: string | null } | null;
}

interface CompletionProgressProps {
  refreshTrigger: number;
}

const CompletionProgress = ({ refreshTrigger }: CompletionProgressProps) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<
    { student: { id: string; first_name: string; last_name: string }; items: SummaryItem[] }[]
  >([]);

  useEffect(() => {
    if (user) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshTrigger
  }, [user, refreshTrigger]);

  const load = async () => {
    if (!user) return;

    try {
      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];
      const mapped = list
        .map((l: unknown) => mapStudentFromParentLink(l as Parameters<typeof mapStudentFromParentLink>[0], user.id))
        .filter(Boolean) as {
        id: string;
        first_name: string;
        last_name: string;
      }[];

      const next: { student: (typeof mapped)[0]; items: SummaryItem[] }[] = [];

      for (const student of mapped) {
        try {
          const summary = (await documentService.getSummary(student.id)) as {
            items?: SummaryItem[];
          };
          const items = Array.isArray(summary?.items) ? summary.items : [];
          if (items.length === 0) continue;
          next.push({ student, items });
        } catch {
          /* skip student */
        }
      }

      setRows(next);
    } catch (error) {
      console.error('Error fetching progress:', error);
      setRows([]);
    }
  };

  const itemStatus = (item: SummaryItem) => {
    const doc = item.latestDocument;
    if (doc?.verifiedAt) return 'complete' as const;
    if (doc && !doc.verifiedAt) return 'pending' as const;
    return 'missing' as const;
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Enrollment Progress</CardTitle>
        </div>
        <CardDescription>Required documents from your school (per assigned form)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rows.map(({ student, items }) => {
          const required = items.length;
          const approved = items.filter((i) => i.latestDocument?.verifiedAt).length;
          const pct = required > 0 ? Math.round((approved / required) * 100) : 0;

          return (
            <div key={student.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">
                    {student.first_name} {student.last_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {approved} of {required} required documents verified
                  </p>
                </div>
                <Badge
                  variant={pct === 100 ? 'default' : 'secondary'}
                  className={pct === 100 ? 'bg-green-600' : ''}
                >
                  {pct}%
                </Badge>
              </div>

              <Progress value={pct} className="h-2" />

              <div className="grid grid-cols-2 gap-2 pt-2">
                {items.map((item) => {
                  const status = itemStatus(item);
                  const label = item.documentType?.name || 'Document';
                  return (
                    <div key={item.documentType.id} className="flex items-center gap-2 text-sm">
                      {status === 'complete' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : status === 'pending' ? (
                        <Circle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span
                        className={
                          status === 'complete'
                            ? 'text-green-600'
                            : status === 'missing'
                              ? 'text-muted-foreground'
                              : ''
                        }
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default CompletionProgress;
