import type { Gender, PatientCondition, Specialization } from '@doctor-tracker/shared';
import argon2 from 'argon2';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Types } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { DoctorModel } from '../src/modules/doctors/model.js';
import { PatientModel } from '../src/modules/patients/model.js';
import { UserModel } from '../src/modules/users/model.js';

export const ADMIN = { name: 'Test Admin', email: 'admin@example.com', password: 'CorrectHorse#1' };

/** One in-memory MongoDB per test file, wiped between tests so they don't depend on order. */
export function useTestDatabase() {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri());
    // The list and dashboard queries rely on these existing (unique email, collations).
    await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  });

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });
}

export const app = createApp();

export async function createAdmin() {
  return UserModel.create({
    name: ADMIN.name,
    email: ADMIN.email,
    passwordHash: await argon2.hash(ADMIN.password),
    role: 'admin',
  });
}

/** A supertest agent that keeps cookies, signed in as the admin. */
export async function signedInAgent() {
  await createAdmin();
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/login')
    .send({ email: ADMIN.email, password: ADMIN.password })
    .expect(200);
  return agent;
}

let sequence = 0;

type DoctorSeed = {
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
};

type PatientSeed = {
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  condition: PatientCondition;
  admittedAt: Date;
  notes: string;
  doctorId: Types.ObjectId | string | null;
};

export function doctorFields(overrides: Partial<DoctorSeed> = {}): DoctorSeed {
  sequence += 1;
  return {
    name: `Doctor ${sequence}`,
    specialization: 'Cardiology',
    hospital: 'Square Hospitals Ltd.',
    phone: `+880 1711-${String(100000 + sequence)}`,
    email: `doctor${sequence}@square.example.com`,
    ...overrides,
  };
}

export function patientFields(overrides: Partial<PatientSeed> = {}): PatientSeed {
  sequence += 1;
  return {
    name: `Patient ${sequence}`,
    age: 40,
    gender: 'female',
    phone: `+880 1811-${String(100000 + sequence)}`,
    condition: 'stable',
    admittedAt: new Date(Date.now() - 86_400_000),
    notes: '',
    doctorId: null,
    ...overrides,
  };
}

export const createDoctor = (overrides?: Partial<DoctorSeed>) =>
  DoctorModel.create(doctorFields(overrides));

export const createPatient = (overrides?: Partial<PatientSeed>) =>
  PatientModel.create(patientFields(overrides));

/** The value of a cookie from a response's Set-Cookie headers. */
export function cookieValue(setCookie: string[] | string | undefined, name: string) {
  const header = [setCookie ?? []].flat().find((cookie) => cookie.startsWith(`${name}=`));
  return header?.split(';')[0]?.slice(name.length + 1);
}
