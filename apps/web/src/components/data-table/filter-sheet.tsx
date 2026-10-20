'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type FilterSheetProps = {
  activeCount: number;
  onClearAll: () => void;
  children: ReactNode;
};

/** On phones the filter row would wrap into a wall of buttons; it collapses into one sheet. */
export function FilterSheet({ activeCount, onClearAll, children }: FilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 md:hidden">
          <SlidersHorizontal aria-hidden />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Results update as you change filters.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 [&>button]:w-full [&>button]:justify-start">
          {children}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={onClearAll} disabled={activeCount === 0}>
            Clear all filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
