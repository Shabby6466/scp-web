import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  FileText,
  Link as LinkIcon,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  AlertTriangle,
} from 'lucide-react';
import { ComplianceRequirement, ComplianceEvidence, useComplianceFramework, EvidenceType } from '@/hooks/useComplianceFramework';
import { useUserRole } from '@/hooks/useUserRole';

interface RequirementDetailDrawerProps {
  requirement: ComplianceRequirement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

const RequirementDetailDrawer = ({
  requirement,
  open,
  onOpenChange,
  onRefresh,
}: RequirementDetailDrawerProps) => {
  const { schoolId } = useUserRole();
  const { 
    markRequirementComplete, 
    updateRequirement,
    addEvidence, 
    getEvidenceForRequirement, 
    deleteEvidence 
  } = useComplianceFramework(schoolId);

  const [evidence, setEvidence] = useState<ComplianceEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [addingEvidence, setAddingEvidence] = useState(false);
  
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('link');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');

  useEffect(() => {
    if (requirement && open) {
      loadEvidence();
    }
  }, [requirement?.id, open]);

  const loadEvidence = async () => {
    if (!requirement) return;
    setLoadingEvidence(true);
    const data = await getEvidenceForRequirement(requirement.id);
    setEvidence(data);
    setLoadingEvidence(false);
  };

  const handleMarkComplete = async () => {
    if (!requirement) return;
    await markRequirementComplete(requirement.id);
    onRefresh();
    onOpenChange(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!requirement) return;
    await updateRequirement(requirement.id, { status: status as any });
    onRefresh();
  };

  const handleAddEvidence = async () => {
    if (!requirement) return;
    setAddingEvidence(true);
    
    await addEvidence({
      requirement_id: requirement.id,
      evidence_type: evidenceType,
      url: evidenceType === 'link' ? evidenceUrl : null,
      note: evidenceNote,
    });

    setEvidenceUrl('');
    setEvidenceNote('');
    await loadEvidence();
    setAddingEvidence(false);
    onRefresh();
  };

  const handleDeleteEvidence = async (id: string) => {
    await deleteEvidence(id);
    await loadEvidence();
    onRefresh();
  };

  if (!requirement) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'not_applicable': return 'bg-gray-100 text-gray-600';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getEvidenceIcon = (type: EvidenceType) => {
    switch (type) {
      case 'document': return FileText;
      case 'link': return LinkIcon;
      case 'photo': return Upload;
      case 'log': return FileText;
      default: return FileText;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-xl">{requirement.title}</SheetTitle>
              <SheetDescription className="mt-1">
                {requirement.description || 'No description provided'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={requirement.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="not_applicable">N/A</SelectItem>
              </SelectContent>
            </Select>
            
            {requirement.status !== 'complete' && (
              <Button onClick={handleMarkComplete} size="sm">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}

            {requirement.risk_level === 'high' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                High Risk
              </Badge>
            )}
          </div>

          <Separator />

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Frequency</Label>
              <p className="font-medium capitalize">{requirement.frequency.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Next Due Date</Label>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {requirement.next_due_date 
                  ? format(new Date(requirement.next_due_date), 'MMM d, yyyy')
                  : 'Not set'}
              </p>
            </div>
            {requirement.last_completed_at && (
              <div>
                <Label className="text-muted-foreground">Last Completed</Label>
                <p className="font-medium">
                  {format(new Date(requirement.last_completed_at), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Evidence Required</Label>
              <p className="font-medium">{requirement.evidence_required ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {requirement.tags.length > 0 && (
            <div>
              <Label className="text-muted-foreground mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {requirement.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Evidence Binder */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Evidence Binder
              </h3>
              <span className="text-sm text-muted-foreground">
                {evidence.length} item{evidence.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Add Evidence Form */}
            <Card className="mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Select
                    value={evidenceType}
                    onValueChange={(v) => setEvidenceType(v as EvidenceType)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="log">Log Note</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {evidenceType === 'link' && (
                    <Input
                      placeholder="https://..."
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      className="flex-1"
                    />
                  )}
                </div>

                <Textarea
                  placeholder="Add a note (optional)..."
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  rows={2}
                />

                <Button 
                  onClick={handleAddEvidence} 
                  disabled={addingEvidence || (evidenceType === 'link' && !evidenceUrl)}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Evidence
                </Button>
              </CardContent>
            </Card>

            {/* Evidence List */}
            {loadingEvidence ? (
              <p className="text-sm text-muted-foreground">Loading evidence...</p>
            ) : evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No evidence attached yet
              </p>
            ) : (
              <div className="space-y-2">
                {evidence.map((e) => {
                  const Icon = getEvidenceIcon(e.evidence_type);
                  return (
                    <div
                      key={e.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          {e.url && (
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              {e.url.substring(0, 40)}...
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {e.note && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {e.note}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Added {format(new Date(e.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteEvidence(e.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RequirementDetailDrawer;
