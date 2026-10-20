import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

type ActiveFiltersProps = {
  filters: ActiveFilter[];
  onClearAll: () => void;
};

/** Every applied filter as a removable chip, so the current view is always readable at a glance. */
export function ActiveFilters({ filters, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="bg-secondary text-secondary-foreground inline-flex h-7 items-center gap-1 rounded-md pr-1 pl-2.5 text-xs"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span className="max-w-48 truncate font-medium">{filter.value}</span>
          <button
            type="button"
            onClick={filter.onRemove}
            className="hover:bg-background/80 focus-visible:ring-ring/50 rounded-sm p-0.5 outline-none focus-visible:ring-2"
            aria-label={`Remove ${filter.label} ${filter.value} filter`}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
