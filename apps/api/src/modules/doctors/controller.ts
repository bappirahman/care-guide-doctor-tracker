import type {
  Doctor,
  DoctorDetail,
  DoctorFilters,
  DoctorInput,
  DoctorListQuery,
  DoctorUpdate,
  ItemResponse,
  ListResponse,
} from '@doctor-tracker/shared';
import type { Request, Response } from 'express';
import * as doctorService from './service.js';

type IdParams = { id: string };
type NoParams = Record<string, never>;

export async function list(
  req: Request<NoParams, unknown, unknown, DoctorListQuery>,
  res: Response<ListResponse<Doctor>>,
) {
  res.json(await doctorService.listDoctors(req.query));
}

export async function filters(_req: Request, res: Response<ItemResponse<DoctorFilters>>) {
  res.json({ data: await doctorService.getDoctorFilters() });
}

export async function get(req: Request<IdParams>, res: Response<ItemResponse<DoctorDetail>>) {
  res.json({ data: await doctorService.getDoctor(req.params.id) });
}

export async function create(
  req: Request<NoParams, unknown, DoctorInput>,
  res: Response<ItemResponse<Doctor>>,
) {
  res.status(201).json({ data: await doctorService.createDoctor(req.body) });
}

export async function update(
  req: Request<IdParams, unknown, DoctorUpdate>,
  res: Response<ItemResponse<Doctor>>,
) {
  res.json({ data: await doctorService.updateDoctor(req.params.id, req.body) });
}

export async function remove(req: Request<IdParams>, res: Response) {
  await doctorService.deleteDoctor(req.params.id);
  res.status(204).end();
}
