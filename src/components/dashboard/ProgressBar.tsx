import { useEffect, useState } from 'react';
import { documentService } from '@/services/documentService';
import { studentParentService } from '@/services/studentParentService';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp } from 'lucide-react';

interface ProgressBarProps {
  refreshTrigger: number;
}

const REQUIRED_DOCUMENT_CATEGORIES = [
  'immunization_records',
  'health_forms',
  'emergency_contacts',
  'birth_certificate',
  'proof_of_residence',
  'medical_records'
];

const ProgressBar = ({ refreshTrigger }: ProgressBarProps) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalRequired, setTotalRequired] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user, refreshTrigger]);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const students = await studentParentService.getStudentsOfParent(user.id);

      if (!students || students.length === 0) {
        setProgress(0);
        setCompletedCount(0);
        setTotalRequired(0);
        return;
      }

      const documents = await documentService.search({ ownerUserId: user.id, status: 'approved' });

      const approvedDocs = documents || [];
    
    // Calculate unique approved categories across all students
    const uniqueApprovedCategories = new Set(approvedDocs.map(d => d.category));
    const approved = uniqueApprovedCategories.size;
    
    const required = REQUIRED_DOCUMENT_CATEGORIES.length * students.length;
    const percentage = required > 0 ? Math.round((approved / required) * 100) : 0;

    setProgress(percentage);
    setCompletedCount(approved);
    setTotalRequired(required);
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
                {completedCount} of {totalRequired} required documents
              </p>
            </div>
          </div>
          <Badge 
            variant={progress === 100 ? "default" : "secondary"}
            className={`text-lg px-3 py-1 ${progress === 100 ? 'bg-green-600' : ''}`}
          >
            {progress}%
          </Badge>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-3" />
          
          {progress === 100 && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              All required documents complete!
            </div>
          )}
          
          {progress > 0 && progress < 100 && (
            <p className="text-xs text-muted-foreground">
              Keep going! You're {progress}% of the way there.
            </p>
          )}
          
          {progress === 0 && totalRequired > 0 && (
            <p className="text-xs text-muted-foreground">
              Start uploading documents to track your progress
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressBar;
