import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Upload, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import DocumentUploadDialog from '@/components/DocumentUploadDialog';

interface ChildCardProps {
  student: any;
  documents: any[];
  requiredCount: number;
  onDocumentUploaded: () => void;
  onClick?: () => void;
}

const ChildCard = ({ student, documents, requiredCount, onDocumentUploaded, onClick }: ChildCardProps) => {
  const studentDocs = documents.filter(
    (d) => (d.ownerUserId ?? d.student_id) === student.id,
  );
  
  const approvedCount = studentDocs.filter(d => d.status === 'approved').length;
  const pendingCount = studentDocs.filter(d => d.status === 'pending').length;
  const rejectedCount = studentDocs.filter(d => d.status === 'rejected').length;
  
  const progress = requiredCount > 0 ? Math.round((approvedCount / requiredCount) * 100) : 0;
  
  const fi = (student.first_name || '?').charAt(0);
  const li = (student.last_name || '?').charAt(0);
  const initials = `${fi}${li}`.toUpperCase();
  const dobMs = student.date_of_birth ? new Date(student.date_of_birth).getTime() : NaN;
  const age = Number.isNaN(dobMs)
    ? null
    : Math.floor((Date.now() - dobMs) / (1000 * 60 * 60 * 24 * 365));

  return (
    <Card 
      className="hover:shadow-card-hover transition-all duration-200 cursor-pointer" 
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 border-2 border-border">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Student Info & Progress */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {student.first_name} {student.last_name}
                </h3>
                {progress === 100 && (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {age !== null && <span>Age {age}</span>}
                {age !== null && student.grade_level && <span className="text-border">•</span>}
                {student.grade_level && <span>{student.grade_level}</span>}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Progress</span>
                <span className="text-muted-foreground">
                  {approvedCount}/{requiredCount}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {approvedCount > 0 && (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {approvedCount}
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingCount}
                </Badge>
              )}
              {rejectedCount > 0 && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {rejectedCount}
                </Badge>
              )}
            </div>

            {/* Upload Button */}
            <DocumentUploadDialog 
              students={[student]} 
              onDocumentUploaded={onDocumentUploaded}
              defaultStudentId={student.id}
            >
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full sm:w-auto" 
                onClick={(e) => e.stopPropagation()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DocumentUploadDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChildCard;
