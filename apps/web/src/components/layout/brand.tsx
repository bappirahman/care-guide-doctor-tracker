import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
        <Activity className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight">Doctor Tracker</span>
    </div>
  );
}
