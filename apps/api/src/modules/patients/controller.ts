import type {
  ItemResponse,
  ListResponse,
  Patient,
  PatientInputParsed,
  PatientListQuery,
  PatientUpdate,
} from '@doctor-tracker/shared';
import type { Request, Response } from 'express';
import * as patientService from './service.js';

type IdParams = { id: string };
type NoParams = Record<string, never>;

export async function list(
  req: Request<NoParams, unknown, unknown, PatientListQuery>,
  res: Response<ListResponse<Patient>>,
) {
  res.json(await patientService.listPatients(req.query));
}

export async function get(req: Request<IdParams>, res: Response<ItemResponse<Patient>>) {
  res.json({ data: await patientService.getPatient(req.params.id) });
}

export async function create(
  req: Request<NoParams, unknown, PatientInputParsed>,
  res: Response<ItemResponse<Patient>>,
) {
  res.status(201).json({ data: await patientService.createPatient(req.body) });
}

export async function update(
  req: Request<IdParams, unknown, PatientUpdate>,
  res: Response<ItemResponse<Patient>>,
) {
  res.json({ data: await patientService.updatePatient(req.params.id, req.body) });
}

export async function remove(req: Request<IdParams>, res: Response) {
  await patientService.deletePatient(req.params.id);
  res.status(204).end();
}
