'use client';

import type { StatsInterval } from '@doctor-tracker/shared';
import { differenceInCalendarDays, format } from 'date-fns';
import { CalendarX } from 'lucide-react';
import Link from 'next/link';
import { DateRangeFilter } from '@/components/data-table/date-range-filter';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/shared/list-states';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CONDITION_META, ConditionDot } from '@/features/patients/condition';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDashboardStats } from './api';
import { ChartCard } from './chart-card';
import { AdmissionsChart, ConditionChart, TopDoctorsChart } from './charts';
import { useDashboardParams } from './search-params';
import { StatCards, StatCardsSkeleton } from './stat-cards';

export function DashboardView() {
  const [params, setParams] = useDashboardParams();
  const stats = useDashboardStats(params);

  const data = stats.data;
  const days = data
    ? differenceInCalendarDays(new Date(data.range.to), new Date(data.range.from)) + 1
    : null;
  const periodLabel = days ? pluralize(days, 'day') : 'period';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Admissions, workload and patient condition across every doctor."
      />

      {/* One row of controls scopes everything below it, so every number agrees. */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          label="Period"
          value={{ from: params.from, to: params.to }}
          onChange={(range) => void setParams(range)}
        />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={data?.range.interval ?? params.interval ?? ''}
          onValueChange={(value) => value && void setParams({ interval: value as StatsInterval })}
          aria-label="Group admissions by"
        >
          <ToggleGroupItem value="day" className="h-9 px-3">
            Daily
          </ToggleGroupItem>
          <ToggleGroupItem value="week" className="h-9 px-3">
            Weekly
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {stats.isError ? (
        <ErrorState
          title="Couldn't load the dashboard"
          error={stats.error}
          onRetry={() => void stats.refetch()}
        />
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <div
          aria-busy={stats.isPlaceholderData}
          className={cn(
            'flex flex-col gap-6',
            stats.isPlaceholderData && 'opacity-60 transition-opacity',
          )}
        >
          <StatCards stats={data} periodLabel={periodLabel} />

          {data.admissions.current === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="No admissions in this period"
              description="Pick a wider date range to see trends, workload and conditions."
            />
          ) : (
            <>
              <ChartCard
                title="Admissions over time"
                description={`${formatNumber(data.admissions.current)} new patients, ${formatDate(data.range.from)} – ${formatDate(data.range.to)}, grouped ${data.range.interval === 'day' ? 'by day' : 'by week'}`}
                chart={<AdmissionsChart stats={data} />}
                table={{
                  columns: [
                    { header: data.range.interval === 'day' ? 'Day' : 'Week of' },
                    { header: 'Admissions', align: 'right' },
                  ],
                  rows: data.overTime.map((bucket) => [
                    format(new Date(bucket.date), 'EEE d MMM yyyy'),
                    formatNumber(bucket.count),
                  ]),
                }}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title={`Top ${data.topDoctors.length} doctors by admissions`}
                  description={
                    data.unassigned > 0
                      ? `${pluralize(data.unassigned, 'admission')} in this period ${data.unassigned === 1 ? 'has' : 'have'} no doctor yet.`
                      : 'Every admission in this period has a doctor.'
                  }
                  chart={<TopDoctorsChart stats={data} />}
                  table={{
                    columns: [
                      { header: 'Doctor' },
                      { header: 'Specialization' },
                      { header: 'Admissions', align: 'right' },
                    ],
                    rows: data.topDoctors.map((doctor) => [
                      <Link
                        key={doctor.id}
                        href={`/doctors/${doctor.id}`}
                        className="hover:underline"
                      >
                        {doctor.name}
                      </Link>,
                      doctor.specialization,
                      formatNumber(doctor.count),
                    ]),
                  }}
                />
                <ChartCard
                  title="Condition breakdown"
                  description="Current condition of patients admitted in this period"
                  chart={<ConditionChart stats={data} />}
                  table={{
                    columns: [{ header: 'Condition' }, { header: 'Patients', align: 'right' }],
                    rows: data.byCondition.map((row) => [
                      <span key={row.condition} className="flex items-center gap-2">
                        <ConditionDot condition={row.condition} />
                        {CONDITION_META[row.condition].label}
                      </span>,
                      formatNumber(row.count),
                    ]),
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Same footprint as the loaded dashboard, so nothing jumps when data arrives.
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <StatCardsSkeleton />
      <Card className="h-[22rem] p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-60 w-full" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
