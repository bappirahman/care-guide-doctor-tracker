'use client';

import { Check, PlusCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type FacetOption<V extends string> = {
  value: V;
  label: string;
  // e.g. the condition dot, so the option looks like the badge it filters for.
  adornment?: ReactNode;
};

type FacetFilterProps<V extends string> = {
  title: string;
  options: FacetOption<V>[];
  selected: V[];
  onChange: (selected: V[]) => void;
  className?: string;
};

export function FacetFilter<V extends string>({
  title,
  options,
  selected,
  onChange,
  className,
}: FacetFilterProps<V>) {
  const toggle = (value: V) =>
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-9 border-dashed', className)}>
          <PlusCircle aria-hidden />
          {title}
          {selected.length > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-vertical:h-4 data-vertical:self-center"
              />
              <Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
                {selected.length}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          {options.length > 7 && <CommandInput placeholder={`Search ${title.toLowerCase()}`} />}
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                    aria-selected={isSelected}
                  >
                    <span
                      className={cn(
                        'border-primary flex size-4 shrink-0 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50',
                      )}
                    >
                      {isSelected && <Check className="size-3" aria-hidden />}
                    </span>
                    {option.adornment}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center">
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
