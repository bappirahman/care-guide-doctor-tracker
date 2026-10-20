'use client';

import { subDays, subMonths } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDay, parseDay } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export type DayRange = { from: string | null; to: string | null };

const PRESETS = [
  { label: 'Last 7 days', from: () => subDays(new Date(), 6) },
  { label: 'Last 30 days', from: () => subDays(new Date(), 29) },
  { label: 'Last 90 days', from: () => subDays(new Date(), 89) },
  { label: 'Last 12 months', from: () => subMonths(new Date(), 12) },
] as const;

export function describeRange({ from, to }: DayRange) {
  const start = from ? parseDay(from) : null;
  const end = to ? parseDay(to) : null;
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Until ${formatDate(end)}`;
  return null;
}

type DateRangeFilterProps = {
  label: string;
  value: DayRange;
  onChange: (value: DayRange) => void;
  className?: string;
};

export function DateRangeFilter({ label, value, onChange, className }: DateRangeFilterProps) {
  const isMobile = useIsMobile();
  const selected = {
    from: value.from ? (parseDay(value.from) ?? undefined) : undefined,
    to: value.to ? (parseDay(value.to) ?? undefined) : undefined,
  };
  const summary = describeRange(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 justify-start', !summary && 'border-dashed', className)}
        >
          <CalendarDays aria-hidden />
          {summary ? (
            <span>
              <span className="text-muted-foreground">{label}:</span> {summary}
            </span>
          ) : (
            label
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto flex-col gap-0 p-0 sm:flex-row" align="start">
        <div className="flex flex-wrap gap-1 border-b p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              className="justify-start font-normal"
              onClick={() =>
                onChange({ from: formatDay(preset.from()), to: formatDay(new Date()) })
              }
            >
              {preset.label}
            </Button>
          ))}
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground justify-start font-normal"
              onClick={() => onChange({ from: null, to: null })}
            >
              Clear dates
            </Button>
          )}
        </div>
        <Calendar
          mode="range"
          numberOfMonths={isMobile ? 1 : 2}
          defaultMonth={selected.from ?? subMonths(new Date(), isMobile ? 0 : 1)}
          selected={selected}
          onSelect={(range) =>
            onChange({
              from: range?.from ? formatDay(range.from) : null,
              to: range?.to ? formatDay(range.to) : null,
            })
          }
          disabled={{ after: new Date() }}
        />
      </PopoverContent>
    </Popover>
  );
}
