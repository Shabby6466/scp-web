import { useState } from 'react';
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
import { useComplianceFramework } from '@/hooks/useComplianceFramework';
import { useUserRole } from '@/hooks/useUserRole';

interface CreateInspectionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateInspectionTypeDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateInspectionTypeDialogProps) => {
  const { schoolId } = useUserRole();
  const { createInspectionType } = useComplianceFramework(schoolId);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const result = await createInspectionType({
      name: name.trim(),
      description: description.trim() || null,
    });
    setLoading(false);

    if (result) {
      setName('');
      setDescription('');
      onOpenChange(false);
      onSuccess();
    }
  };

  const quickAddOptions = [
    { name: 'NYC DOH', description: 'NYC Department of Health inspection requirements' },
    { name: 'Fire Safety', description: 'Fire and life safety inspection requirements' },
    { name: 'Building Safety', description: 'Building and facilities safety requirements' },
  ];

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
          {/* Quick Add Options */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Quick Add</Label>
            <div className="flex flex-wrap gap-2">
              {quickAddOptions.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(option.name);
                    setDescription(option.description);
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
