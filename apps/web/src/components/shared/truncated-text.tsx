'use client';

import { useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Truncates to one line and shows the full text in a tooltip, but only when it was cut off. */
export function TruncatedText({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  const isTruncated = () => {
    const element = ref.current;
    return element !== null && element.scrollWidth > element.clientWidth;
  };

  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && isTruncated())}>
      <TooltipTrigger asChild>
        <span ref={ref} className={cn('block truncate', className)}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  );
}
