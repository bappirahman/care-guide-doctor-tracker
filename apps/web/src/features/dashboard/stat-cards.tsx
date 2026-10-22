import type { DashboardStats } from '@doctor-tracker/shared';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';

type StatCardsProps = { stats: DashboardStats; periodLabel: string };

export function StatCards({ stats, periodLabel }: StatCardsProps) {
  const { admissions, totals, critical } = stats;
  const criticalShare = admissions.current === 0 ? 0 : (critical / admissions.current) * 100;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label="Total doctors" value={totals.doctors} footnote="Registered doctors" />
      <StatCard label="Total patients" value={totals.patients} footnote="All time" />
      <StatCard
        label="New patients"
        value={admissions.current}
        footnote={<Change pct={admissions.changePct} periodLabel={periodLabel} />}
      />
      <StatCard
        label="Critical patients"
        value={critical}
        footnote={`${Math.round(criticalShare)}% of new patients in this period`}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  footnote,
}: {
  label: string;
  value: number;
  footnote: ReactNode;
}) {
  return (
    <Card className="gap-2 px-4 py-4 sm:px-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p data-slot="stat-value" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {formatNumber(value)}
      </p>
      <div className="text-muted-foreground text-xs">{footnote}</div>
    </Card>
  );
}

/**
 * More admissions is neither good nor bad, so the change is shown with direction
 * (arrow + sign) but in neutral ink: green/red would imply a judgement.
 */
function Change({ pct, periodLabel }: { pct: number | null; periodLabel: string }) {
  if (pct === null) return <span>No admissions in the previous {periodLabel}</span>;

  const rounded = Math.round(pct);
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span>
      <Icon className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
      <span className="text-foreground font-medium">
        {rounded > 0 ? '+' : ''}
        {rounded}%
      </span>{' '}
      vs previous {periodLabel}
    </span>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="gap-3 px-4 py-4 sm:px-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-36" />
        </Card>
      ))}
    </div>
  );
}
