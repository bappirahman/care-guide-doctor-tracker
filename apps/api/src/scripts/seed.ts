import {
  type Gender,
  type PatientCondition,
  SPECIALIZATIONS,
  type Specialization,
} from '@doctor-tracker/shared';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { SessionModel } from '../modules/auth/model.js';
import { DoctorModel } from '../modules/doctors/model.js';
import { PatientModel } from '../modules/patients/model.js';
import { UserModel } from '../modules/users/model.js';
import { HOSPITALS, MOBILE_PREFIXES, NAME_POOLS, SPECIALIZATION_PROFILES } from './seed-data.js';

const DOCTOR_COUNT = 50;
const PATIENT_COUNT = 5000;
const UNASSIGNED_SHARE = 0.03;
const BATCH_SIZE = 1000;
const DAY_MS = 86_400_000;
const DHAKA_UTC_OFFSET_MS = 6 * 3_600_000;

// mulberry32: a fixed seed makes every run produce the same dataset, so screenshots,
// explain() output and README numbers stay reproducible.
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = createRandom(20_261_021);
const chance = (probability: number) => random() < probability;
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
}

function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let threshold = random() * total;
  for (const item of items) {
    threshold -= weightOf(item);
    if (threshold <= 0) return item;
  }
  return pick(items);
}

function personName(gender: Gender) {
  const { pool } = pickWeighted(NAME_POOLS, (entry) => entry.weight);
  const female = gender === 'female';
  const first = pick(female ? pool.female : pool.male);
  const family =
    female && pool.femaleFamily && chance(0.6) ? pick(pool.femaleFamily) : pick(pool.family);
  return { first, family, full: `${first} ${family}` };
}

function mobileNumber() {
  const prefix = pick(MOBILE_PREFIXES).slice(1);
  return `+880 ${prefix}${between(10, 99)}-${String(between(0, 999_999)).padStart(6, '0')}`;
}

function buildDoctors(now: number) {
  const emails = new Set<string>();

  return Array.from({ length: DOCTOR_COUNT }, () => {
    const specialization = pickWeighted(
      SPECIALIZATIONS,
      (item) => SPECIALIZATION_PROFILES[item].doctorWeight,
    );
    const hospitals = HOSPITALS.filter((hospital) => hospital.domain !== 'nhf');
    const hospital =
      specialization === 'Cardiology' && chance(0.4)
        ? (HOSPITALS.find((item) => item.domain === 'nhf') ?? pick(hospitals))
        : pick(hospitals);

    const name = personName(chance(0.42) ? 'female' : 'male');
    const base = `${name.first}.${name.family}`.toLowerCase();
    let email = `${base}@${hospital.domain}.example.com`;
    for (let n = 2; emails.has(email); n += 1) {
      email = `${base}${n}@${hospital.domain}.example.com`;
    }
    emails.add(email);

    // Most doctors were onboarded before the patient window; some joined during it,
    // which gives the created-date filter something to narrow down.
    const createdAt = new Date(
      chance(0.8) ? now - between(366, 540) * DAY_MS : now - between(30, 330) * DAY_MS,
    );

    return {
      _id: new mongoose.Types.ObjectId(),
      name: name.full,
      specialization,
      hospital: hospital.name,
      phone: mobileNumber(),
      email,
      createdAt,
      updatedAt: createdAt,
      // Some doctors carry far more patients than others, like a real roster.
      workload: 0.3 + random() ** 2 * 2.2,
    };
  });
}

/**
 * Daily admission weights for the last 365 days: steady growth, quieter Fridays
 * and Saturdays (the Bangladeshi weekend), and a monsoon bump for dengue season.
 */
function admissionDayWeights(now: number) {
  return Array.from({ length: 365 }, (_, index) => {
    const day = new Date(now - (364 - index) * DAY_MS + DHAKA_UTC_OFFSET_MS);
    const growth = 0.65 + 0.7 * (index / 364);
    const weekday = day.getUTCDay();
    const weekend = weekday === 5 ? 0.6 : weekday === 6 ? 0.85 : 1;
    const monsoon = day.getUTCMonth() >= 6 && day.getUTCMonth() <= 9 ? 1.2 : 1;
    return growth * weekend * monsoon * (0.85 + random() * 0.3);
  });
}

function conditionFor(daysSinceAdmission: number): PatientCondition {
  const weights: Record<PatientCondition, number> =
    daysSinceAdmission <= 3
      ? { critical: 0.2, under_observation: 0.35, recovering: 0.3, stable: 0.15 }
      : daysSinceAdmission <= 14
        ? { critical: 0.1, under_observation: 0.25, recovering: 0.4, stable: 0.25 }
        : { critical: 0.04, under_observation: 0.08, recovering: 0.28, stable: 0.6 };
  const conditions = Object.keys(weights) as PatientCondition[];
  return pickWeighted(conditions, (condition) => weights[condition]);
}

function buildPatients(now: number, doctors: ReturnType<typeof buildDoctors>) {
  const dayWeights = admissionDayWeights(now);
  const days = dayWeights.map((weight, index) => ({ weight, index }));

  return Array.from({ length: PATIENT_COUNT }, () => {
    const { index } = pickWeighted(days, (day) => day.weight);
    const daysAgo = 364 - index;
    // Admissions between 07:00 and 23:00 Dhaka time, never in the future.
    const dayStart = Math.floor((now + DHAKA_UTC_OFFSET_MS) / DAY_MS) * DAY_MS;
    const admittedAt = new Date(
      Math.min(
        now - 60_000,
        dayStart - daysAgo * DAY_MS - DHAKA_UTC_OFFSET_MS + between(7 * 60, 23 * 60) * 60_000,
      ),
    );

    const eligible = doctors.filter((doctor) => doctor.createdAt <= admittedAt);
    const doctor =
      chance(UNASSIGNED_SHARE) || eligible.length === 0
        ? null
        : pickWeighted(eligible, (item) => item.workload);

    const specialization: Specialization = doctor?.specialization ?? pick(SPECIALIZATIONS);
    const profile = SPECIALIZATION_PROFILES[specialization];
    const gender: Gender = chance(0.005)
      ? 'other'
      : chance(profile.femaleShare ?? 0.5)
        ? 'female'
        : 'male';
    const createdAt = new Date(admittedAt.getTime() + between(5, 90) * 60_000);

    return {
      doctorId: doctor?._id ?? null,
      name: personName(gender).full,
      age: between(...profile.ageRange),
      gender,
      phone: mobileNumber(),
      condition: conditionFor(daysAgo),
      admittedAt,
      notes: pick(profile.notes),
      createdAt,
      updatedAt: createdAt,
    };
  });
}

async function ensureAdmin() {
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  if (await UserModel.exists({ email })) {
    logger.info({ email }, 'Admin user already exists');
    return;
  }
  await UserModel.create({
    name: env.SEED_ADMIN_NAME,
    email,
    passwordHash: await argon2.hash(env.SEED_ADMIN_PASSWORD),
    role: 'admin',
  });
  logger.info({ email }, 'Created admin user');
}

async function seed() {
  const reset = process.argv.includes('--reset');
  // Indexes are built explicitly below, so skip Mongoose's background autoIndex.
  await mongoose.connect(env.MONGO_URI, { autoIndex: false, serverSelectionTimeoutMS: 5000 });

  try {
    if (reset) {
      await mongoose.connection.dropDatabase();
      logger.info('Dropped database');
    }
    await Promise.all(
      [UserModel, SessionModel, DoctorModel, PatientModel].map((model) => model.syncIndexes()),
    );
    await ensureAdmin();

    if (await DoctorModel.exists({})) {
      logger.info('Doctors already present, skipping. Run with --reset to reseed.');
      return;
    }

    const now = Date.now();
    const doctors = buildDoctors(now);
    const patients = buildPatients(now, doctors);

    await DoctorModel.insertMany(doctors.map(({ workload: _workload, ...doctor }) => doctor));
    for (let start = 0; start < patients.length; start += BATCH_SIZE) {
      await PatientModel.insertMany(patients.slice(start, start + BATCH_SIZE));
    }

    logger.info(
      {
        doctors: doctors.length,
        patients: patients.length,
        unassigned: patients.filter((patient) => patient.doctorId === null).length,
      },
      'Seed complete',
    );
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((err: unknown) => {
  logger.error({ err }, 'Seed failed');
  process.exitCode = 1;
});
