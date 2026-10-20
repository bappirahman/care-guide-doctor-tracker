import { z } from 'zod';
import type { PatientCondition, Specialization } from '../constants.js';

export const STATS_INTERVALS = ['day', 'week'] as const;
export type StatsInterval = (typeof STATS_INTERVALS)[number];

export const statsQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    // Omitted means "pick one": daily up to 90 days, weekly beyond that.
    interval: z.enum(STATS_INTERVALS).optional(),
    top: z.coerce.number().int().min(1).max(25).default(10),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: '`from` must be before `to`',
    path: ['from'],
  });
export type StatsQuery = z.infer<typeof statsQuerySchema>;

export type DashboardStats = {
  range: { from: string; to: string; interval: StatsInterval };
  totals: { doctors: number; patients: number };
  admissions: {
    current: number;
    previous: number;
    // null when the previous period had no admissions (a % change would be meaningless).
    changePct: number | null;
  };
  critical: number;
  unassigned: number;
  overTime: { date: string; count: number }[];
  byCondition: { condition: PatientCondition; count: number }[];
  topDoctors: { id: string; name: string; specialization: Specialization; count: number }[];
};
