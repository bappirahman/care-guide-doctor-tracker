import type { ListResponse, Patient } from '@doctor-tracker/shared';
import type { Agent } from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDoctor,
  createPatient,
  patientFields,
  signedInAgent,
  useTestDatabase,
} from './helpers.js';

useTestDatabase();

let agent: Agent;

beforeEach(async () => {
  agent = await signedInAgent();
});

const list = async (query: string) =>
  (await agent.get(`/api/v1/patients${query}`).expect(200)).body as ListResponse<Patient>;

describe('patient CRUD', () => {
  it('creates, reads, updates, unassigns and deletes a patient', async () => {
    const doctor = await createDoctor({ name: 'Assigned Doctor' });

    const created = await agent
      .post('/api/v1/patients')
      .send({ ...patientFields(), doctorId: doctor.id, age: '52' })
      .expect(201);
    const id: string = created.body.data.id;
    expect(created.body.data).toMatchObject({
      age: 52,
      doctor: { id: doctor.id, name: 'Assigned Doctor' },
    });

    await agent.get(`/api/v1/patients/${id}`).expect(200);

    // A partial update must leave unmentioned fields alone, the doctor included.
    const updated = await agent
      .patch(`/api/v1/patients/${id}`)
      .send({ condition: 'critical' })
      .expect(200);
    expect(updated.body.data).toMatchObject({ condition: 'critical', doctor: { id: doctor.id } });

    const unassigned = await agent
      .patch(`/api/v1/patients/${id}`)
      .send({ doctorId: null })
      .expect(200);
    expect(unassigned.body.data.doctor).toBeNull();
    expect((await list('?doctorId=unassigned')).data.map((patient) => patient.id)).toContain(id);

    await agent.delete(`/api/v1/patients/${id}`).expect(204);
    await agent.get(`/api/v1/patients/${id}`).expect(404);
  });

  it('refuses a doctor that does not exist', async () => {
    const response = await agent
      .post('/api/v1/patients')
      .send({ ...patientFields(), doctorId: '000000000000000000000000' })
      .expect(400);

    expect(response.body.error.details).toEqual([
      expect.objectContaining({ path: 'doctorId', message: 'That doctor no longer exists' }),
    ]);
  });

  it('refuses an admission date in the future', async () => {
    const response = await agent
      .post('/api/v1/patients')
      .send(patientFields({ admittedAt: new Date(Date.now() + 86_400_000) }))
      .expect(400);

    expect(response.body.error.details[0].path).toBe('admittedAt');
  });

  it('answers a malformed id with a validation error, not a server error', async () => {
    const response = await agent.get('/api/v1/patients/not-an-id').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /patients filters', () => {
  it('filters by doctor, condition and admission date together', async () => {
    const doctor = await createDoctor();
    const recent = new Date(Date.now() - 2 * 86_400_000);
    const old = new Date(Date.now() - 200 * 86_400_000);
    await createPatient({ doctorId: doctor._id, condition: 'critical', admittedAt: recent });
    await createPatient({ doctorId: doctor._id, condition: 'stable', admittedAt: recent });
    await createPatient({ doctorId: doctor._id, condition: 'critical', admittedAt: old });
    await createPatient({ condition: 'critical', admittedAt: recent });

    const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const result = await list(`?doctorId=${doctor.id}&condition=critical&from=${from}`);

    expect(result.meta.total).toBe(1);
    expect(result.data[0]).toMatchObject({ condition: 'critical', doctor: { id: doctor.id } });
  });

  it('lists newest admissions first by default', async () => {
    await createPatient({ name: 'Older', admittedAt: new Date(Date.now() - 5 * 86_400_000) });
    await createPatient({ name: 'Newer', admittedAt: new Date(Date.now() - 86_400_000) });

    expect((await list('')).data.map((patient) => patient.name)).toEqual(['Newer', 'Older']);
  });
});
