import type { DashboardStats } from '@doctor-tracker/shared';
import { describe, expect, it } from 'vitest';
import { createDoctor, createPatient, signedInAgent, useTestDatabase } from './helpers.js';

useTestDatabase();

const DAY = 86_400_000;

describe('GET /stats/overview', () => {
  it('counts the period, compares it with the one before, and fills empty days', async () => {
    const agent = await signedInAgent();
    const busy = await createDoctor({ name: 'Busy Doctor' });
    const quiet = await createDoctor({ name: 'Quiet Doctor' });
    const now = Date.now();

    await createPatient({
      doctorId: busy._id,
      condition: 'critical',
      admittedAt: new Date(now - 1 * DAY),
    });
    await createPatient({
      doctorId: busy._id,
      condition: 'stable',
      admittedAt: new Date(now - 2 * DAY),
    });
    await createPatient({
      doctorId: quiet._id,
      condition: 'stable',
      admittedAt: new Date(now - 3 * DAY),
    });
    await createPatient({ condition: 'recovering', admittedAt: new Date(now - 3 * DAY) });
    // In the previous 7-day window, so it only counts toward the comparison.
    await createPatient({
      doctorId: busy._id,
      condition: 'stable',
      admittedAt: new Date(now - 9 * DAY),
    });

    const from = new Date(now - 7 * DAY).toISOString();
    const response = await agent.get(`/api/v1/stats/overview?from=${from}`).expect(200);
    const stats = response.body.data as DashboardStats;

    expect(stats.totals).toEqual({ doctors: 2, patients: 5 });
    expect(stats.admissions).toEqual({ current: 4, previous: 1, changePct: 300 });
    expect(stats.critical).toBe(1);
    expect(stats.unassigned).toBe(1);
    expect(stats.topDoctors.map((doctor) => [doctor.name, doctor.count])).toEqual([
      ['Busy Doctor', 2],
      ['Quiet Doctor', 1],
    ]);
    expect(stats.byCondition.find((row) => row.condition === 'stable')?.count).toBe(2);

    // A continuous daily axis: quiet days are present with zero, and nothing is lost.
    expect(stats.range.interval).toBe('day');
    expect(stats.overTime.length).toBeGreaterThanOrEqual(7);
    expect(stats.overTime.some((bucket) => bucket.count === 0)).toBe(true);
    expect(stats.overTime.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(4);
  });
});
