import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DocumentTypeFieldDef } from '@/types/api';
import { Plus, Trash2 } from 'lucide-react';

const FIELD_TYPES: DocumentTypeFieldDef['type'][] = [
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'select',
];

type Props = {
  fields: DocumentTypeFieldDef[];
  onChange: (fields: DocumentTypeFieldDef[]) => void;
};

function emptyField(): DocumentTypeFieldDef {
  return { key: '', label: '', type: 'text', required: false };
}

export default function DynamicFieldsBuilder({ fields, onChange }: Props) {
  const update = (index: number, patch: Partial<DocumentTypeFieldDef>) => {
    const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  };

  const addField = () => onChange([...fields, emptyField()]);

  const removeField = (index: number) =>
    onChange(fields.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Dynamic form fields</Label>
        <Button type="button" variant="outline" size="sm" onClick={addField} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
          No extra fields — uploaders only attach a file (if required).
        </p>
      ) : (
        fields.map((field, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Key</Label>
                <Input
                  placeholder="inspectionDate"
                  value={field.key}
                  onChange={(e) => update(index, { key: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  placeholder="Inspection date"
                  value={field.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(v) =>
                    update(index, { type: v as DocumentTypeFieldDef['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={Boolean(field.required)}
                  onCheckedChange={(v) => update(index, { required: v })}
                />
                <Label className="text-xs">Required</Label>
              </div>
            </div>
            {field.type === 'select' && (
              <div className="space-y-1">
                <Label className="text-xs">Options (comma-separated)</Label>
                <Input
                  placeholder="Pass, Fail, Conditional"
                  value={(field.options ?? []).join(', ')}
                  onChange={(e) =>
                    update(index, {
                      options: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => removeField(index)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

export function validateDynamicFields(fields: DocumentTypeFieldDef[]): string | null {
  const keys = new Set<string>();
  for (const f of fields) {
    const key = f.key.trim();
    if (!key) return 'Each field needs a key';
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      return `Invalid field key "${key}" — use camelCase or snake_case`;
    }
    if (keys.has(key)) return `Duplicate field key "${key}"`;
    keys.add(key);
    if (!f.label.trim()) return `Field "${key}" needs a label`;
    if (f.type === 'select' && (!f.options || f.options.length === 0)) {
      return `Select field "${key}" needs options`;
    }
  }
  return null;
}
