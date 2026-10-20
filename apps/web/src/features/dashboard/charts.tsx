'use client';

import type { DashboardStats, StatsInterval } from '@doctor-tracker/shared';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { CONDITION_META } from '@/features/patients/condition';
import { formatNumber } from '@/lib/format';

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
// Bars stay thin and are rounded only at the data end, square on the baseline.
const BAR_SIZE = 18;
const BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];
const ROW_HEIGHT = 32;

type TooltipRow = { value: number; label: string; color: string };
type TooltipProps = {
  active?: boolean;
  payload?: { payload: Record<string, unknown> }[];
  title: (datum: Record<string, unknown>) => string;
  rows: (datum: Record<string, unknown>) => TooltipRow[];
};

/** Value first and strong, the series name secondary, keyed by a short line of its color. */
function ValueTooltip({ active, payload, title, rows }: TooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="bg-popover text-popover-foreground min-w-36 rounded-md border px-3 py-2 text-xs shadow-sm">
      <p className="text-muted-foreground mb-1.5">{title(datum)}</p>
      {rows(datum).map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span
            className="h-0.5 w-3 rounded-full bg-(--key)"
            style={{ '--key': row.color } as CSSProperties}
            aria-hidden
          />
          <span className="text-sm font-semibold">{formatNumber(row.value)}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

const bucketLabel = (iso: string, interval: StatsInterval) =>
  interval === 'week'
    ? `Week of ${format(new Date(iso), 'd MMM yyyy')}`
    : format(new Date(iso), 'EEE d MMM yyyy');

export function AdmissionsChart({ stats }: { stats: DashboardStats }) {
  const { interval } = stats.range;
  return (
    <ChartContainer
      config={{ count: { label: 'Admissions', color: 'var(--chart-1)' } }}
      className="aspect-auto h-64 w-full"
    >
      <AreaChart
        data={stats.overTime}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
          tick={AXIS_TICK}
          tickFormatter={(iso: string) => format(new Date(iso), 'd MMM')}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        {/* A vertical hairline that snaps to the nearest date: readers aim at a day, not a line. */}
        <Tooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
          content={
            <ValueTooltip
              title={(datum) => bucketLabel(String(datum.date), interval)}
              rows={(datum) => [
                { value: Number(datum.count), label: 'admissions', color: 'var(--chart-1)' },
              ]}
            />
          }
        />
        <Area
          dataKey="count"
          type="monotone"
          stroke="var(--color-count)"
          strokeWidth={2}
          fill="var(--color-count)"
          fillOpacity={0.1}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function TopDoctorsChart({ stats }: { stats: DashboardStats }) {
  const router = useRouter();
  const rows = stats.topDoctors;
  return (
    <ChartContainer
      config={{ count: { label: 'Admissions', color: 'var(--chart-1)' } }}
      className="aspect-auto w-full"
      style={{ height: rows.length * ROW_HEIGHT + 8 }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={136}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
          content={
            <ValueTooltip
              title={(datum) => `${String(datum.name)} · ${String(datum.specialization)}`}
              rows={(datum) => [
                { value: Number(datum.count), label: 'admissions', color: 'var(--chart-1)' },
              ]}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          barSize={BAR_SIZE}
          radius={BAR_RADIUS}
          className="cursor-pointer"
          onClick={(entry: { payload?: { id?: string } }) => {
            if (entry.payload?.id) router.push(`/doctors/${entry.payload.id}`);
          }}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function ConditionChart({ stats }: { stats: DashboardStats }) {
  const total = stats.byCondition.reduce((sum, row) => sum + row.count, 0);
  const rows = stats.byCondition.map((row) => ({
    ...row,
    label: CONDITION_META[row.condition].label,
    tone: CONDITION_META[row.condition].tone,
    // Count plus share at the bar tip: every value is readable without hovering.
    display: `${formatNumber(row.count)} · ${total === 0 ? 0 : Math.round((row.count / total) * 100)}%`,
  }));

  return (
    <ChartContainer
      config={{ count: { label: 'Patients' } }}
      className="aspect-auto w-full"
      style={{ height: rows.length * (ROW_HEIGHT + 8) + 8 }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={136}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
          content={
            <ValueTooltip
              title={(datum) => String(datum.label)}
              rows={(datum) => [
                { value: Number(datum.count), label: 'patients', color: String(datum.tone) },
              ]}
            />
          }
        />
        <Bar dataKey="count" barSize={BAR_SIZE + 4} radius={BAR_RADIUS} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.condition} fill={row.tone} />
          ))}
          <LabelList
            dataKey="display"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
