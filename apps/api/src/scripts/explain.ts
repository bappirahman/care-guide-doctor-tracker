import {
  doctorListQuerySchema,
  patientListQuerySchema,
  statsQuerySchema,
} from '@doctor-tracker/shared';
import mongoose, { type Types } from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { DoctorModel } from '../modules/doctors/model.js';
import { doctorListQuery, patientCountPipeline } from '../modules/doctors/service.js';
import { PatientModel } from '../modules/patients/model.js';
import { patientListQuery } from '../modules/patients/service.js';
import { overviewPipeline, resolveRange } from '../modules/stats/service.js';

/**
 * Runs the API's real list/search/filter queries with explain('executionStats')
 * and fails if any of them scans the collection or sorts in memory. The queries
 * come from the same builders the services use, so this can't drift from them.
 */

type Check = {
  name: string;
  explain: () => Promise<unknown>;
  // A documented exception: why an in-memory SORT is acceptable for this query.
  sortAllowed?: string;
  // Must be answered from the index alone: any fetched document is a failure.
  covered?: boolean;
};

const PAGE_SIZE = 20;

// Prefix search is a range on `searchTokens`; no index can return those matches in
// date order, so they are sorted after the scan. Only matching rows are sorted, and
// with a limit MongoDB keeps just the top page while doing it.
const SEARCH_SORT = 'sorts only the matches';

async function explainDoctorList(raw: Record<string, unknown>) {
  const { filter, sort, collation } = doctorListQuery(doctorListQuerySchema.parse(raw));
  const query = DoctorModel.find(filter).sort(sort).limit(PAGE_SIZE);
  if (collation) query.collation(collation);
  const output: unknown = await query.explain('executionStats');
  return output;
}

async function explainPatientList(raw: Record<string, unknown>) {
  const { filter, sort, collation } = patientListQuery(patientListQuerySchema.parse(raw));
  const query = PatientModel.find(filter).sort(sort).limit(PAGE_SIZE);
  if (collation) query.collation(collation);
  const output: unknown = await query.explain('executionStats');
  return output;
}

async function busiestDoctorId() {
  const [row] = await PatientModel.aggregate<{ _id: Types.ObjectId }>([
    { $match: { doctorId: { $ne: null } } },
    { $sortByCount: '$doctorId' },
    { $limit: 1 },
  ]);
  return row?._id.toString();
}

async function explainOverview(raw: Record<string, unknown>) {
  const query = statsQuerySchema.parse(raw);
  const output: unknown = await PatientModel.aggregate(
    overviewPipeline(resolveRange(query), query.top),
  ).explain('executionStats');
  return output;
}

const checks: Check[] = [
  { name: 'doctors: default list', explain: () => explainDoctorList({}) },
  { name: 'doctors: oldest first', explain: () => explainDoctorList({ sort: 'createdAt' }) },
  { name: 'doctors: name A-Z', explain: () => explainDoctorList({ sort: 'name' }) },
  { name: 'doctors: name Z-A', explain: () => explainDoctorList({ sort: '-name' }) },
  {
    name: 'doctors: search "rah"',
    explain: () => explainDoctorList({ search: 'rah' }),
    sortAllowed: SEARCH_SORT,
  },
  {
    name: 'doctors: search phone "017"',
    explain: () => explainDoctorList({ search: '017' }),
    sortAllowed: SEARCH_SORT,
  },
  {
    name: 'doctors: 2 specializations',
    explain: () => explainDoctorList({ specialization: ['Cardiology', 'Neurology'] }),
  },
  {
    name: 'doctors: hospital + created range',
    explain: () =>
      explainDoctorList({
        hospital: 'Square Hospitals Ltd.',
        from: '2025-06-01',
        to: '2026-06-30',
      }),
  },
  {
    name: 'doctors: created range',
    explain: () => explainDoctorList({ from: '2026-01-01', to: '2026-06-30' }),
  },
  {
    name: 'doctors: patient counts for a page',
    explain: async () => {
      const page = await DoctorModel.find().sort({ createdAt: -1, _id: -1 }).limit(PAGE_SIZE);
      const ids: Types.ObjectId[] = page.map((doctor) => doctor._id);
      const output: unknown = await PatientModel.aggregate(patientCountPipeline(ids)).explain(
        'executionStats',
      );
      return output;
    },
  },
  { name: 'patients: default list', explain: () => explainPatientList({}) },
  { name: 'patients: oldest first', explain: () => explainPatientList({ sort: 'admittedAt' }) },
  { name: 'patients: name A-Z', explain: () => explainPatientList({ sort: 'name' }) },
  {
    name: 'patients: search "rah"',
    explain: () => explainPatientList({ search: 'rah' }),
    sortAllowed: SEARCH_SORT,
  },
  {
    name: 'patients: critical',
    explain: () => explainPatientList({ condition: 'critical' }),
  },
  {
    name: 'patients: critical + recovering, last 90 days',
    explain: () =>
      explainPatientList({
        condition: ['critical', 'recovering'],
        from: new Date(Date.now() - 90 * 86_400_000).toISOString(),
      }),
  },
  {
    name: 'patients: one doctor',
    explain: async () => explainPatientList({ doctorId: await busiestDoctorId() }),
  },
  { name: 'patients: unassigned', explain: () => explainPatientList({ doctorId: 'unassigned' }) },
  {
    name: 'dashboard: overview, last 90 days',
    explain: () => explainOverview({}),
    covered: true,
  },
  {
    name: 'dashboard: overview, last 12 months',
    explain: () => explainOverview({ from: new Date(Date.now() - 365 * 86_400_000).toISOString() }),
    covered: true,
  },
  {
    name: 'patients: admitted in the last 30 days',
    explain: () =>
      explainPatientList({ from: new Date(Date.now() - 30 * 86_400_000).toISOString() }),
  },
];

// explain() output differs between find and aggregate, and between the classic and
// slot-based engines, so the interesting parts are located by key wherever they are.
function findKey(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  if (key in value) return (value as Record<string, unknown>)[key];
  for (const child of Object.values(value)) {
    const found = findKey(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

type PlanStage = {
  stage?: string;
  indexName?: string;
  inputStage?: PlanStage;
  inputStages?: PlanStage[];
  queryPlan?: PlanStage;
};

type ExecutionStats = {
  totalKeysExamined?: number;
  totalDocsExamined?: number;
  nReturned?: number;
};

function stagesOf(stage: PlanStage | undefined): string[] {
  if (!stage) return [];
  if (stage.queryPlan) return stagesOf(stage.queryPlan);
  const label = stage.indexName ? `${stage.stage}(${stage.indexName})` : (stage.stage ?? '?');
  const children = stage.inputStage ? [stage.inputStage] : (stage.inputStages ?? []);
  if (children.length > 1) {
    return [`${label}[${children.map((child) => stagesOf(child).join(' > ')).join(' | ')}]`];
  }
  return [label, ...stagesOf(children[0])];
}

async function main() {
  await mongoose.connect(env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  const rows: string[][] = [];
  let failed = false;

  try {
    for (const check of checks) {
      const output = await check.explain();
      const stages = stagesOf(findKey(output, 'winningPlan') as PlanStage | undefined);
      const stats = (findKey(output, 'executionStats') ?? {}) as ExecutionStats;

      const scans = stages.some((stage) => stage.includes('COLLSCAN'));
      const sorts = stages.includes('SORT');
      const fetched = (stats.totalDocsExamined ?? 0) > 0;
      const ok =
        !scans && (!sorts || check.sortAllowed !== undefined) && !(check.covered && fetched);
      failed ||= !ok;

      rows.push([
        ok ? 'ok' : 'FAIL',
        check.name,
        stages.join(' > '),
        String(stats.totalKeysExamined ?? '-'),
        String(stats.totalDocsExamined ?? '-'),
        String(stats.nReturned ?? '-'),
        sorts && check.sortAllowed ? check.sortAllowed : check.covered ? 'must be covered' : '',
      ]);
    }
  } finally {
    await mongoose.disconnect();
  }

  const header = ['', 'query', 'winning plan', 'keys', 'docs', 'returned', 'note'];
  const table = [header, ...rows];
  const widths = header.map((_, column) =>
    Math.max(...table.map((row) => row[column]?.length ?? 0)),
  );
  const lines = table.map((row) =>
    row
      .map((cell, column) => cell.padEnd(widths[column] ?? 0))
      .join('  ')
      .trimEnd(),
  );
  process.stdout.write(`${lines.join('\n')}\n`);

  if (failed) {
    process.stdout.write(
      '\nA query above scans the collection, sorts in memory, or fetches documents it should not.\n',
    );
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Explain failed');
  process.exitCode = 1;
});
