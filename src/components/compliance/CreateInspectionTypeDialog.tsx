import { useEffect, useState } from 'react';
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
import { useComplianceFramework, type InspectionProgramCategory } from '@/hooks/useComplianceFramework';
import { useUserRole } from '@/hooks/useUserRole';

interface CreateInspectionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** When set with `lockCategory`, new types are always created under this program. */
  defaultCategory?: InspectionProgramCategory;
  /** If true, category is fixed to `defaultCategory` (e.g. Facility & Safety hub). */
  lockCategory?: boolean;
}

const quickAddOptions: Array<{
  name: string;
  description: string;
  category: InspectionProgramCategory;
}> = [
  { name: 'NYC DOH', description: 'NYC Department of Health inspection requirements', category: 'doh' },
  { name: 'Fire Safety', description: 'Fire and life safety inspection requirements', category: 'facility_safety' },
  { name: 'Building Safety', description: 'Building and facilities safety requirements', category: 'facility_safety' },
];

const CreateInspectionTypeDialog = ({
  open,
  onOpenChange,
  onSuccess,
  defaultCategory = 'facility_safety',
  lockCategory = false,
}: CreateInspectionTypeDialogProps) => {
  const { schoolId } = useUserRole();
  const { createInspectionType } = useComplianceFramework(schoolId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<InspectionProgramCategory>(defaultCategory);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(lockCategory ? defaultCategory : defaultCategory);
    }
  }, [open, defaultCategory, lockCategory]);

  const visibleQuickAdds = lockCategory
    ? quickAddOptions.filter((o) => o.category === 'facility_safety')
    : quickAddOptions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const effectiveCategory = lockCategory ? defaultCategory : category;
    const result = await createInspectionType({
      name: name.trim(),
      description: description.trim() || null,
      category: effectiveCategory,
    });
    setLoading(false);

    if (result) {
      setName('');
      setDescription('');
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inspection Type</DialogTitle>
          <DialogDescription>
            Create a new inspection framework to track requirements
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!lockCategory && (
            <div className="space-y-2">
              <Label htmlFor="inspection-category">Program</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as InspectionProgramCategory)}
              >
                <SelectTrigger id="inspection-category">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facility_safety">Facility & safety</SelectItem>
                  <SelectItem value="doh">DOH / licensing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quick Add</Label>
            <div className="flex flex-wrap gap-2">
              {visibleQuickAdds.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(option.name);
                    setDescription(option.description);
                    if (!lockCategory) setCategory(option.category);
                  }}
                >
                  {option.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., NYC DOH"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this inspection type..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInspectionTypeDialog;
