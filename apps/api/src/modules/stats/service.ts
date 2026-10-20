import {
  type DashboardStats,
  PATIENT_CONDITIONS,
  type PatientCondition,
  type Specialization,
  type StatsInterval,
  type StatsQuery,
} from '@doctor-tracker/shared';
import type { PipelineStage, Types } from 'mongoose';
import { DoctorModel } from '../doctors/model.js';
import { PatientModel } from '../patients/model.js';

// Bucket boundaries follow the clinic's clock, not UTC. Asia/Dhaka has no DST, so a
// fixed +06:00 offset in JS matches what $dateTrunc computes with the named zone.
const TIMEZONE = 'Asia/Dhaka';
const UTC_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 90;
// Bangladesh's working week starts on Sunday (Friday and Saturday are the weekend).
const WEEK_STARTS_ON = 'sunday';
const SUNDAY = 0;

export function resolveRange(query: StatsQuery) {
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(startOfDay(to.getTime()) - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);
  const days = Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
  const interval: StatsInterval = query.interval ?? (days <= DEFAULT_RANGE_DAYS ? 'day' : 'week');
  return { from, to, interval };
}

/**
 * The only stage that can use an index is the first $match; `$facet` sub-pipelines
 * never can. Projecting down to the three fields every facet reads lets that match
 * be answered from `{ admittedAt, condition, doctorId }` alone: a covered scan.
 */
export function overviewPipeline(
  { from, to, interval }: ReturnType<typeof resolveRange>,
  top: number,
): PipelineStage[] {
  return [
    { $match: { admittedAt: { $gte: from, $lte: to } } },
    { $project: { _id: 0, admittedAt: 1, condition: 1, doctorId: 1 } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byCondition: [{ $group: { _id: '$condition', count: { $sum: 1 } } }],
        overTime: [
          {
            $group: {
              _id: {
                $dateTrunc: {
                  date: '$admittedAt',
                  unit: interval,
                  timezone: TIMEZONE,
                  ...(interval === 'week' ? { startOfWeek: WEEK_STARTS_ON } : {}),
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        topDoctors: [
          { $match: { doctorId: { $ne: null } } },
          { $group: { _id: '$doctorId', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: top },
          // Names are looked up for the top N only, after the counting is done.
          {
            $lookup: {
              from: DoctorModel.collection.name,
              localField: '_id',
              foreignField: '_id',
              as: 'doctor',
              pipeline: [{ $project: { name: 1, specialization: 1 } }],
            },
          },
          { $unwind: '$doctor' },
        ],
        unassigned: [{ $match: { doctorId: null } }, { $count: 'count' }],
      },
    },
  ];
}

type FacetResult = {
  total: { count: number }[];
  byCondition: { _id: PatientCondition; count: number }[];
  overTime: { _id: Date; count: number }[];
  topDoctors: {
    _id: Types.ObjectId;
    count: number;
    doctor: { name: string; specialization: Specialization };
  }[];
  unassigned: { count: number }[];
};

export async function getOverview(query: StatsQuery): Promise<DashboardStats> {
  const range = resolveRange(query);
  const length = range.to.getTime() - range.from.getTime();

  const [[facets], previous, doctors, patients] = await Promise.all([
    PatientModel.aggregate<FacetResult>(overviewPipeline(range, query.top)),
    // The same span immediately before, for the "vs previous period" change.
    PatientModel.countDocuments({
      admittedAt: { $gte: new Date(range.from.getTime() - length), $lt: range.from },
    }),
    // Totals come from collection metadata: O(1), no scan.
    DoctorModel.estimatedDocumentCount(),
    PatientModel.estimatedDocumentCount(),
  ]);

  const current = facets?.total[0]?.count ?? 0;
  const conditionCounts = new Map(facets?.byCondition.map((row) => [row._id, row.count]));

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      interval: range.interval,
    },
    totals: { doctors, patients },
    admissions: {
      current,
      previous,
      changePct: previous === 0 ? null : ((current - previous) / previous) * 100,
    },
    critical: conditionCounts.get('critical') ?? 0,
    unassigned: facets?.unassigned[0]?.count ?? 0,
    overTime: fillBuckets(range, facets?.overTime ?? []),
    byCondition: PATIENT_CONDITIONS.map((condition) => ({
      condition,
      count: conditionCounts.get(condition) ?? 0,
    })),
    topDoctors: (facets?.topDoctors ?? []).map((row) => ({
      id: row._id.toString(),
      name: row.doctor.name,
      specialization: row.doctor.specialization,
      count: row.count,
    })),
  };
}

const startOfDay = (time: number) =>
  Math.floor((time + UTC_OFFSET_MS) / DAY_MS) * DAY_MS - UTC_OFFSET_MS;

function startOfBucket(time: number, interval: StatsInterval) {
  const day = startOfDay(time);
  if (interval === 'day') return day;
  const weekday = new Date(day + UTC_OFFSET_MS).getUTCDay();
  return day - ((weekday - SUNDAY + 7) % 7) * DAY_MS;
}

/**
 * $group only returns buckets that have admissions. Quiet days are filled in with
 * zero here, so the chart's x-axis is continuous instead of skipping gaps.
 */
function fillBuckets(
  { from, to, interval }: ReturnType<typeof resolveRange>,
  rows: { _id: Date; count: number }[],
) {
  const counts = new Map(rows.map((row) => [row._id.getTime(), row.count]));
  const step = interval === 'day' ? DAY_MS : 7 * DAY_MS;
  const buckets: { date: string; count: number }[] = [];
  for (let time = startOfBucket(from.getTime(), interval); time <= to.getTime(); time += step) {
    buckets.push({ date: new Date(time).toISOString(), count: counts.get(time) ?? 0 });
  }
  return buckets;
}
