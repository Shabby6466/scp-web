import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DocumentTypeFieldDef } from '@/types/api';

type Props = {
  fields: DocumentTypeFieldDef[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
};

export function validateDynamicFieldValues(
  fields: DocumentTypeFieldDef[],
  values: Record<string, unknown>,
): string | null {
  for (const field of fields) {
    const raw = values[field.key];
    const empty =
      raw === undefined ||
      raw === null ||
      raw === '' ||
      (typeof raw === 'string' && raw.trim() === '');
    if (field.required && empty) {
      return `${field.label} is required`;
    }
  }
  return null;
}

export default function DynamicFieldsForm({ fields, values, onChange, disabled }: Props) {
  if (fields.length === 0) return null;

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-sm font-medium">Additional information</Label>
      {fields.map((field) => {
        const id = `field-${field.key}`;
        const raw = values[field.key];

        if (field.type === 'textarea') {
          return (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={id}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
              <Textarea
                id={id}
                disabled={disabled}
                value={typeof raw === 'string' ? raw : ''}
                onChange={(e) => setValue(field.key, e.target.value)}
              />
            </div>
          );
        }

        if (field.type === 'number') {
          return (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={id}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
              <Input
                id={id}
                type="number"
                disabled={disabled}
                value={raw != null && raw !== '' ? String(raw) : ''}
                onChange={(e) =>
                  setValue(field.key, e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          );
        }

        if (field.type === 'date') {
          return (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={id}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
              <Input
                id={id}
                type="date"
                disabled={disabled}
                value={typeof raw === 'string' ? raw : ''}
                onChange={(e) => setValue(field.key, e.target.value)}
              />
            </div>
          );
        }

        if (field.type === 'boolean') {
          return (
            <div key={field.key} className="flex items-center gap-2">
              <Switch
                id={id}
                disabled={disabled}
                checked={Boolean(raw)}
                onCheckedChange={(v) => setValue(field.key, v)}
              />
              <Label htmlFor={id}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={id}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
              <Select
                disabled={disabled}
                value={typeof raw === 'string' ? raw : ''}
                onValueChange={(v) => setValue(field.key, v)}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={id}>
              {field.label}
              {field.required ? ' *' : ''}
            </Label>
            <Input
              id={id}
              disabled={disabled}
              value={typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
