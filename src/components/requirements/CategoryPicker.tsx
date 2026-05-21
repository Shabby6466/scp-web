import { cn } from '@/lib/utils';
import type { DocumentCategory } from '@/types/api';
import { Activity, Award, Flame, LayoutGrid } from 'lucide-react';
import { COMPLIANCE_CATEGORY_SLUG } from '@/constants/complianceCategories';

const SLUG_ICON: Record<string, typeof LayoutGrid> = {
  [COMPLIANCE_CATEGORY_SLUG.OVERVIEW]: LayoutGrid,
  [COMPLIANCE_CATEGORY_SLUG.DOH]: Activity,
  [COMPLIANCE_CATEGORY_SLUG.FACILITY_SAFETY]: Flame,
  [COMPLIANCE_CATEGORY_SLUG.CERTIFICATIONS]: Award,
};

type Props = {
  categories: DocumentCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
        No document categories for this school yet. Default categories are created when a school is
        set up — try refreshing, or create one below.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {categories.map((cat) => {
        const Icon = SLUG_ICON[cat.slug] ?? LayoutGrid;
        const selected = cat.id === selectedId;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'hover:bg-muted/50',
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{cat.name}</span>
            </div>
            {cat.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
