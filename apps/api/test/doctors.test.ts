import type { Doctor, ListResponse } from '@doctor-tracker/shared';
import type { Agent } from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { DoctorModel } from '../src/modules/doctors/model.js';
import {
  createDoctor,
  createPatient,
  doctorFields,
  signedInAgent,
  useTestDatabase,
} from './helpers.js';

useTestDatabase();

let agent: Agent;

beforeEach(async () => {
  agent = await signedInAgent();
});

const list = async (query: string) =>
  (await agent.get(`/api/v1/doctors${query}`).expect(200)).body as ListResponse<Doctor>;

describe('GET /doctors', () => {
  it('paginates with consistent meta', async () => {
    for (let index = 0; index < 25; index += 1) await createDoctor();

    const page3 = await list('?page=3&limit=10');

    expect(page3.meta).toEqual({ page: 3, limit: 10, total: 25, totalPages: 3 });
    expect(page3.data).toHaveLength(5);
  });

  it('never returns the same doctor on two pages, even with equal sort keys', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    await DoctorModel.insertMany(
      Array.from({ length: 12 }, () => ({ ...doctorFields(), createdAt, updatedAt: createdAt })),
    );

    const ids = [
      ...(await list('?limit=5&page=1')).data,
      ...(await list('?limit=5&page=2')).data,
      ...(await list('?limit=5&page=3')).data,
    ].map((doctor) => doctor.id);

    expect(new Set(ids).size).toBe(12);
  });

  it('clamps an oversized limit instead of rejecting it', async () => {
    await createDoctor();
    expect((await list('?limit=500')).meta.limit).toBe(100);
  });

  it('searches by name prefix, case-insensitively', async () => {
    await createDoctor({ name: 'Nusrat Rahman' });
    await createDoctor({ name: 'Rahim Uddin' });
    await createDoctor({ name: 'Tanvir Ahmed' });

    const names = (await list('?search=RAH')).data.map((doctor) => doctor.name).sort();

    expect(names).toEqual(['Nusrat Rahman', 'Rahim Uddin']);
  });

  it('finds a doctor by local phone number when it is stored with the country code', async () => {
    await createDoctor({ phone: '+880 1712-345678' });
    expect((await list('?search=01712')).meta.total).toBe(1);
  });

  it('combines specialization, hospital and created-date filters', async () => {
    const inRange = new Date('2026-03-15T00:00:00Z');
    const outOfRange = new Date('2025-01-15T00:00:00Z');
    await DoctorModel.insertMany([
      {
        ...doctorFields({ specialization: 'Cardiology', hospital: 'United Hospital Limited' }),
        createdAt: inRange,
      },
      {
        ...doctorFields({ specialization: 'Neurology', hospital: 'United Hospital Limited' }),
        createdAt: inRange,
      },
      {
        ...doctorFields({ specialization: 'Cardiology', hospital: 'Evercare Hospital Dhaka' }),
        createdAt: inRange,
      },
      {
        ...doctorFields({ specialization: 'Cardiology', hospital: 'United Hospital Limited' }),
        createdAt: outOfRange,
      },
    ]);

    const result = await list(
      '?specialization=Cardiology&specialization=Neurology&hospital=United%20Hospital%20Limited&from=2026-01-01&to=2026-12-31',
    );

    expect(result.meta.total).toBe(2);
    expect(new Set(result.data.map((doctor) => doctor.hospital))).toEqual(
      new Set(['United Hospital Limited']),
    );
  });

  it('sorts by name in both directions, ignoring case', async () => {
    await createDoctor({ name: 'beta Doctor' });
    await createDoctor({ name: 'Alpha Doctor' });
    await createDoctor({ name: 'Gamma Doctor' });

    const ascending = (await list('?sort=name')).data.map((doctor) => doctor.name);
    const descending = (await list('?sort=-name')).data.map((doctor) => doctor.name);

    expect(ascending).toEqual(['Alpha Doctor', 'beta Doctor', 'Gamma Doctor']);
    expect(descending).toEqual([...ascending].reverse());
  });

  it('reports every invalid query parameter at once', async () => {
    const response = await agent
      .get('/api/v1/doctors?page=0&sort=hacked&from=2026-05-01&to=2026-01-01')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.map((issue: { path: string }) => issue.path).sort()).toEqual(
      ['from', 'page', 'sort'],
    );
  });

  it('includes each doctor’s patient count', async () => {
    const doctor = await createDoctor();
    await createPatient({ doctorId: doctor._id });
    await createPatient({ doctorId: doctor._id });

    expect((await list('')).data[0]?.patientCount).toBe(2);
  });
});

describe('POST /doctors', () => {
  it('rejects a duplicate email regardless of case', async () => {
    await agent
      .post('/api/v1/doctors')
      .send(doctorFields({ email: 'same@example.com' }))
      .expect(201);

    const response = await agent
      .post('/api/v1/doctors')
      .send(doctorFields({ email: 'SAME@example.com' }))
      .expect(409);

    expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
  });
});

describe('PATCH /doctors/:id', () => {
  it('makes the doctor searchable by their new name', async () => {
    const doctor = await createDoctor({ name: 'Old Name' });

    await agent.patch(`/api/v1/doctors/${doctor.id}`).send({ name: 'Brand New' }).expect(200);

    expect((await list('?search=brand')).meta.total).toBe(1);
    expect((await list('?search=old')).meta.total).toBe(0);
  });
});

describe('DELETE /doctors/:id', () => {
  it('refuses while patients are assigned, and says how many', async () => {
    const doctor = await createDoctor();
    await createPatient({ doctorId: doctor._id });
    await createPatient({ doctorId: doctor._id });

    const response = await agent.delete(`/api/v1/doctors/${doctor.id}`).expect(409);

    expect(response.body.error).toMatchObject({
      code: 'DOCTOR_HAS_PATIENTS',
      details: { patientCount: 2 },
    });
    expect(await DoctorModel.exists({ _id: doctor._id })).not.toBeNull();
  });

  it('deletes a doctor without patients', async () => {
    const doctor = await createDoctor();
    await agent.delete(`/api/v1/doctors/${doctor.id}`).expect(204);
    await agent.get(`/api/v1/doctors/${doctor.id}`).expect(404);
  });
});
