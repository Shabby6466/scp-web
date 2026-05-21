import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import CategoryPicker from './CategoryPicker';
import DynamicFieldsBuilder, { validateDynamicFields } from './DynamicFieldsBuilder';
import { documentCategoryService } from '@/services/documentCategoryService';
import {
  documentTypeService,
  type CreateDocumentTypePayload,
} from '@/services/documentTypeService';
import type { DocumentCategory, DocumentType, DocumentTypeFieldDef, UserRole } from '@/types/api';
import type { DocumentRequirementTargetRole } from './DocumentTypeRequirementsPanel';

const NONE = '__none__';

export type BranchOption = { id: string; name?: string; branchName?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRole: DocumentRequirementTargetRole;
  schoolId: string;
  editing?: DocumentType | null;
  branches?: BranchOption[];
  showBranchField?: boolean;
  onSaved: () => void;
};

type Step = 1 | 2;

export default function AddDocumentTypeWizard({
  open,
  onOpenChange,
  targetRole,
  schoolId,
  editing,
  branches = [],
  showBranchField = false,
  onSaved,
}: Props) {
  const isEdit = Boolean(editing?.id);
  const [step, setStep] = useState<Step>(1);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [renewalMonths, setRenewalMonths] = useState('');
  const [requiresFile, setRequiresFile] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [fields, setFields] = useState<DocumentTypeFieldDef[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (!open || !schoolId) return;
    setLoadingCategories(true);
    documentCategoryService
      .list({ schoolId })
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { data?: DocumentCategory[] }).data ?? [];
        setCategories(list);
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoadingCategories(false));
  }, [open, schoolId]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setStep(2);
      setCategoryId(editing.categoryId ?? editing.category?.id ?? '');
      setName(editing.name ?? '');
      setDescription(editing.description ?? '');
      setRenewalMonths(
        editing.renewalMonths != null ? String(editing.renewalMonths) : '',
      );
      setRequiresFile(editing.requiresFile !== false);
      setBranchId(editing.branchId ?? '');
      setFields(editing.fields ?? []);
    } else {
      setStep(1);
      setCategoryId('');
      setName('');
      setDescription('');
      setRenewalMonths('');
      setRequiresFile(true);
      setBranchId('');
      setFields([]);
    }
  }, [open, editing]);

  const makeSlug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handleCreateCategory = async () => {
    const n = newCategoryName.trim();
    if (!n) {
      toast.error('Category name is required');
      return;
    }
    setCreatingCategory(true);
    try {
      const created = await documentCategoryService.create({
        name: n,
        slug: makeSlug(n),
        schoolId,
      });
      const row = created as DocumentCategory;
      setCategories((prev) => [...prev, row]);
      setCategoryId(row.id);
      setNewCategoryName('');
      toast.success('Category created');
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const buildPayload = (): CreateDocumentTypePayload | null => {
    if (!name.trim()) {
      toast.error('Name is required');
      return null;
    }
    if (!categoryId) {
      toast.error('Category is required');
      return null;
    }
    const fieldErr = validateDynamicFields(fields);
    if (fieldErr) {
      toast.error(fieldErr);
      return null;
    }
    let renewal: number | null = null;
    if (renewalMonths.trim()) {
      const n = Number(renewalMonths.trim());
      if (!Number.isFinite(n) || n <= 0) {
        toast.error('Renewal months must be a positive number');
        return null;
      }
      renewal = n;
    }
    return {
      categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
      roles: [targetRole as UserRole],
      renewalMonths: renewal,
      fields,
      requiresFile,
      schoolId,
      branchId: branchId.trim() || undefined,
    };
  };

  const save = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      if (isEdit && editing) {
        await documentTypeService.update(editing.id, payload);
        toast.success('Document type updated');
      } else {
        await documentTypeService.create(payload);
        toast.success('Document type created — requirements materialized for matching users');
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit document type' : 'Add requirement'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this document template for the selected audience.'
              : step === 1
                ? 'Step 1 of 2 — choose which compliance category this belongs to.'
                : 'Step 2 of 2 — define the document type and any custom fields.'}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && step === 1 && (
          <div className="space-y-4 pt-2">
            {loadingCategories ? (
              <p className="text-sm text-muted-foreground">Loading categories…</p>
            ) : (
              <CategoryPicker
                categories={categories}
                selectedId={categoryId || null}
                onSelect={setCategoryId}
              />
            )}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Or create a category</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={creatingCategory}
                  onClick={handleCreateCategory}
                >
                  Create
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!categoryId} onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {(isEdit || step === 2) && (
          <div className="space-y-4 pt-2">
            {!isEdit && (
              <p className="text-xs text-muted-foreground">
                Category:{' '}
                <strong>
                  {categories.find((c) => c.id === categoryId)?.name ?? '—'}
                </strong>
              </p>
            )}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g. Fire drill log"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Renewal (months)</Label>
              <Input
                type="number"
                min={1}
                placeholder="Leave empty for no renewal"
                value={renewalMonths}
                onChange={(e) => setRenewalMonths(e.target.value)}
              />
            </div>
            {showBranchField && !isEdit && (
              <div className="space-y-2">
                <Label>Branch (optional)</Label>
                <Select
                  value={branchId || NONE}
                  onValueChange={(v) => setBranchId(v === NONE ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="School-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>School-wide</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {(b.name ?? b.branchName ?? 'Branch').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Requires file upload</Label>
                <p className="text-xs text-muted-foreground">
                  Turn off for metadata-only submissions
                </p>
              </div>
              <Switch checked={requiresFile} onCheckedChange={setRequiresFile} />
            </div>
            <DynamicFieldsBuilder fields={fields} onChange={setFields} />
            <div className="flex justify-between gap-2 pt-2 border-t">
              {!isEdit ? (
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
