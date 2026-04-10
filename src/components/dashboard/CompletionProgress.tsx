import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, TrendingUp } from 'lucide-react';

interface StudentProgress {
  student: any;
  documents: any[];
  completionPercentage: number;
  requiredCount: number;
  submittedCount: number;
  approvedCount: number;
}

interface CompletionProgressProps {
  refreshTrigger: number;
}

// Placeholder for required documents - will be populated by admin/school
const REQUIRED_DOCUMENT_CATEGORIES = [
  'immunization_records',
  'health_forms',
  'emergency_contacts',
  'birth_certificate',
  'proof_of_residence',
  'medical_records'
];

const CompletionProgress = ({ refreshTrigger }: CompletionProgressProps) => {
  const { user } = useAuth();
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user, refreshTrigger]);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const students = await studentParentService.getStudentsOfParent(user.id);

      if (!students) return;

      const progressData: StudentProgress[] = [];

      for (const student of students) {
        const documents = await documentService.search({ ownerUserId: student.id });
        const docs = documents || [];
      const approvedDocs = docs.filter(d => d.status === 'approved');
      
      // Calculate unique categories submitted
      const uniqueCategories = new Set(docs.map(d => d.category));
      const submittedCount = uniqueCategories.size;
      const approvedCount = new Set(approvedDocs.map(d => d.category)).size;
      
      const requiredCount = REQUIRED_DOCUMENT_CATEGORIES.length;
      const completionPercentage = Math.round((approvedCount / requiredCount) * 100);

      progressData.push({
        student,
        documents: docs,
        completionPercentage,
        requiredCount,
        submittedCount,
        approvedCount
      });
    }

      setStudentProgress(progressData);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getCategoryStatus = (student: StudentProgress, category: string) => {
    const docs = student.documents.filter(d => d.category === category);
    if (docs.length === 0) return 'missing';
    const hasApproved = docs.some(d => d.status === 'approved');
    if (hasApproved) return 'complete';
    const hasPending = docs.some(d => d.status === 'pending');
    if (hasPending) return 'pending';
    return 'needs-resubmit';
  };

  if (studentProgress.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Enrollment Progress</CardTitle>
        </div>
        <CardDescription>
          Track document completion for each student
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {studentProgress.map((progress) => (
          <div key={progress.student.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">
                  {progress.student.first_name} {progress.student.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {progress.approvedCount} of {progress.requiredCount} required documents approved
                </p>
              </div>
              <Badge 
                variant={progress.completionPercentage === 100 ? "default" : "secondary"}
                className={progress.completionPercentage === 100 ? "bg-green-600" : ""}
              >
                {progress.completionPercentage}%
              </Badge>
            </div>

            <Progress value={progress.completionPercentage} className="h-2" />

            <div className="grid grid-cols-2 gap-2 pt-2">
              {REQUIRED_DOCUMENT_CATEGORIES.map((category) => {
                const status = getCategoryStatus(progress, category);
                return (
                  <div key={category} className="flex items-center gap-2 text-sm">
                    {status === 'complete' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : status === 'pending' ? (
                      <Circle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    ) : status === 'needs-resubmit' ? (
                      <Circle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={status === 'complete' ? 'text-green-600' : status === 'missing' ? 'text-muted-foreground' : ''}>
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CompletionProgress;
