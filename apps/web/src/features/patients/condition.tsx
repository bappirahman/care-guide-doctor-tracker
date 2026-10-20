import type { PatientCondition } from '@doctor-tracker/shared';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export const CONDITION_META: Record<PatientCondition, { label: string; tone: string }> = {
  stable: { label: 'Stable', tone: 'var(--condition-stable)' },
  recovering: { label: 'Recovering', tone: 'var(--condition-recovering)' },
  under_observation: { label: 'Under observation', tone: 'var(--condition-under-observation)' },
  critical: { label: 'Critical', tone: 'var(--condition-critical)' },
};

const toneStyle = (condition: PatientCondition) =>
  ({ '--tone': CONDITION_META[condition].tone }) as CSSProperties;

/**
 * Soft background, darker text. Mixing the text toward the foreground color makes
 * it darker in light mode and lighter in dark mode from the same single token.
 * The label is always shown: color is never the only signal.
 */
export function ConditionBadge({
  condition,
  className,
}: {
  condition: PatientCondition;
  className?: string;
}) {
  return (
    <span
      style={toneStyle(condition)}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap',
        'bg-[color-mix(in_oklab,var(--tone)_12%,transparent)] text-[color-mix(in_oklab,var(--tone)_70%,var(--foreground))]',
        className,
      )}
    >
      <ConditionDot condition={condition} />
      {CONDITION_META[condition].label}
    </span>
  );
}

export function ConditionDot({ condition }: { condition: PatientCondition }) {
  return (
    <span
      style={toneStyle(condition)}
      className="size-1.5 shrink-0 rounded-full bg-(--tone)"
      aria-hidden
    />
  );
}
