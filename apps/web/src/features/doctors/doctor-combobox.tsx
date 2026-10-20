'use client';

import { UNASSIGNED } from '@doctor-tracker/shared';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDoctor, useDoctors } from './api';

type DoctorComboboxProps = {
  // A doctor id, "unassigned" (filter only) or null.
  value: string | null;
  onChange: (value: string | null) => void;
  // "filter": a toolbar button with an Unassigned option. "field": a form input.
  variant: 'filter' | 'field';
  id?: string;
  invalid?: boolean;
  className?: string;
};

const SEARCH_DEBOUNCE_MS = 250;

/** Searches doctors on the server as you type, so it scales past what fits in a dropdown. */
export function DoctorCombobox({
  value,
  onChange,
  variant,
  id,
  invalid,
  className,
}: DoctorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const doctors = useDoctors({
    search: debounced,
    specialization: [],
    hospital: [],
    from: null,
    to: null,
    sort: 'name',
    page: 1,
    limit: 20,
  });

  const selectedId = value && value !== UNASSIGNED ? value : null;
  const selected = useDoctor(selectedId ?? '', { enabled: selectedId !== null });
  const label =
    value === UNASSIGNED ? 'Unassigned' : selectedId ? (selected.data?.name ?? null) : null;

  const choose = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'filter' ? (
          <Button
            variant="outline"
            size="sm"
            className={cn('h-9', !value && 'border-dashed', className)}
          >
            <PlusCircle aria-hidden />
            {value ? (
              <span>
                <span className="text-muted-foreground">Doctor:</span>{' '}
                {label ?? <Skeleton className="inline-block h-3 w-20 align-middle" />}
              </span>
            ) : (
              'Doctor'
            )}
          </Button>
        ) : (
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            className={cn('w-full justify-between font-normal', className)}
          >
            <span className={cn('truncate', !label && 'text-muted-foreground')}>
              {label ?? (selectedId ? 'Loading…' : 'No doctor (unassigned)')}
            </span>
            <ChevronsUpDown className="opacity-50" aria-hidden />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        {/* Filtering happens on the server; cmdk's own filter would hide valid results. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search doctors" value={search} onValueChange={setSearch} />
          <CommandList>
            {doctors.isPending ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <CommandEmpty>No doctors match “{debounced}”.</CommandEmpty>
            )}
            <CommandGroup>
              {variant === 'filter' ? (
                <ComboOption
                  label="Unassigned"
                  active={value === UNASSIGNED}
                  onSelect={() => choose(UNASSIGNED)}
                />
              ) : (
                <ComboOption
                  label="No doctor (unassigned)"
                  active={value === null}
                  onSelect={() => choose(null)}
                />
              )}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Doctors">
              {doctors.data?.data.map((doctor) => (
                <ComboOption
                  key={doctor.id}
                  label={doctor.name}
                  hint={doctor.specialization}
                  active={value === doctor.id}
                  onSelect={() => choose(doctor.id)}
                />
              ))}
            </CommandGroup>
            {variant === 'filter' && value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => choose(null)} className="justify-center">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ComboOption({
  label,
  hint,
  active,
  onSelect,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={label} onSelect={onSelect} aria-selected={active}>
      <Check className={cn('size-4', !active && 'invisible')} aria-hidden />
      <span className="truncate">{label}</span>
      {hint && <span className="text-muted-foreground ml-auto truncate text-xs">{hint}</span>}
    </CommandItem>
  );
}
