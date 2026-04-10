import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  InspectionType, 
  ComplianceFrequency, 
  RiskLevel, 
  useComplianceFramework 
} from '@/hooks/useComplianceFramework';
import { useUserRole } from '@/hooks/useUserRole';

interface CreateRequirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionTypeId: string | null;
  inspectionTypes: InspectionType[];
  onSuccess: () => void;
}

const CreateRequirementDialog = ({
  open,
  onOpenChange,
  inspectionTypeId,
  inspectionTypes,
  onSuccess,
}: CreateRequirementDialogProps) => {
  const { schoolId } = useUserRole();
  const { createRequirement } = useComplianceFramework(schoolId);

  const [selectedTypeId, setSelectedTypeId] = useState<string>(inspectionTypeId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<ComplianceFrequency>('annual');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [evidenceRequired, setEvidenceRequired] = useState(true);
  const [requiresReview, setRequiresReview] = useState(false);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inspectionTypeId) {
      setSelectedTypeId(inspectionTypeId);
    }
  }, [inspectionTypeId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFrequency('annual');
    setDueDate(undefined);
    setRiskLevel('medium');
    setEvidenceRequired(true);
    setRequiresReview(false);
    setTags('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedTypeId) return;

    setLoading(true);
    const result = await createRequirement({
      inspection_type_id: selectedTypeId,
      title: title.trim(),
      description: description.trim() || null,
      frequency,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      next_due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      risk_level: riskLevel,
      evidence_required: evidenceRequired,
      requires_review: requiresReview,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setLoading(false);

    if (result) {
      resetForm();
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Requirement</DialogTitle>
          <DialogDescription>
            Create a new compliance requirement to track
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inspectionType">Inspection Type *</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select inspection type" />
              </SelectTrigger>
              <SelectContent>
                {inspectionTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Requirement Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Annual Fire Drill Documentation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's required..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ComplianceFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semiannual">Semi-annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., safety, training, documentation"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="evidenceRequired"
                checked={evidenceRequired}
                onCheckedChange={setEvidenceRequired}
              />
              <Label htmlFor="evidenceRequired">Evidence Required</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="requiresReview"
                checked={requiresReview}
                onCheckedChange={setRequiresReview}
              />
              <Label htmlFor="requiresReview">Requires Review</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !selectedTypeId}>
              {loading ? 'Creating...' : 'Create Requirement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRequirementDialog;
