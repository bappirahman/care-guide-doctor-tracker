import {
  type Doctor,
  type DoctorDetail,
  type DoctorFilters,
  type DoctorInput,
  type DoctorListQuery,
  type DoctorUpdate,
  type ListResponse,
  PATIENT_CONDITIONS,
  type PatientCondition,
  type Specialization,
} from '@doctor-tracker/shared';
import { Types } from 'mongoose';
import { HttpError } from '../../lib/http-error.js';
import { dateRangeFilter, paginationMeta, skipFor, sortSpec } from '../../lib/list-query.js';
import { searchFilter } from '../../lib/search.js';
import { PatientModel } from '../patients/model.js';
import { DoctorModel } from './model.js';

type DoctorFields = {
  _id: Types.ObjectId;
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

const toDoctor = (doctor: DoctorFields, patientCount: number): Doctor => ({
  id: doctor._id.toString(),
  name: doctor.name,
  specialization: doctor.specialization,
  hospital: doctor.hospital,
  phone: doctor.phone,
  email: doctor.email,
  patientCount,
  createdAt: doctor.createdAt.toISOString(),
  updatedAt: doctor.updatedAt.toISOString(),
});

const notFound = () => new HttpError(404, 'NOT_FOUND', 'Doctor not found');

/** Exported so the explain script inspects the exact query the list endpoint runs. */
export function doctorListQuery(query: DoctorListQuery) {
  const filter = {
    ...searchFilter(query.search),
    ...(query.specialization?.length ? { specialization: { $in: query.specialization } } : {}),
    ...(query.hospital?.length ? { hospital: { $in: query.hospital } } : {}),
    ...dateRangeFilter('createdAt', query.from, query.to),
  };
  return { filter, ...sortSpec(query.sort) };
}

export async function listDoctors(query: DoctorListQuery): Promise<ListResponse<Doctor>> {
  const { filter, sort, collation } = doctorListQuery(query);

  const pageQuery = DoctorModel.find(filter)
    .sort(sort)
    .skip(skipFor(query.page, query.limit))
    .limit(query.limit)
    .lean<DoctorFields[]>();
  if (collation) pageQuery.collation(collation);

  // The count and the page don't depend on each other, so they run concurrently.
  const [total, doctors] = await Promise.all([DoctorModel.countDocuments(filter), pageQuery]);
  const counts = await patientCountsFor(doctors.map((doctor) => doctor._id));

  return {
    data: doctors.map((doctor) => toDoctor(doctor, counts.get(doctor._id.toString()) ?? 0)),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

/**
 * One grouped query for the whole page instead of a count per row. It only reads
 * `doctorId`, which the `{ doctorId: 1, … }` index already holds.
 */
export const patientCountPipeline = (doctorIds: Types.ObjectId[]) => [
  { $match: { doctorId: { $in: doctorIds } } },
  { $group: { _id: '$doctorId', count: { $sum: 1 } } },
];

async function patientCountsFor(doctorIds: Types.ObjectId[]) {
  if (doctorIds.length === 0) return new Map<string, number>();
  const rows = await PatientModel.aggregate<{ _id: Types.ObjectId; count: number }>(
    patientCountPipeline(doctorIds),
  );
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function getDoctorFilters(): Promise<DoctorFilters> {
  const [specializations, hospitals] = await Promise.all([
    DoctorModel.distinct('specialization'),
    DoctorModel.distinct('hospital'),
  ]);
  return {
    specializations: specializations.sort((a, b) => a.localeCompare(b)),
    hospitals: hospitals.sort((a, b) => a.localeCompare(b)),
  };
}

export async function getDoctor(id: string): Promise<DoctorDetail> {
  const doctorId = new Types.ObjectId(id);
  const [doctor, rows] = await Promise.all([
    DoctorModel.findById(doctorId).lean<DoctorFields>(),
    PatientModel.aggregate<{ _id: PatientCondition; count: number }>([
      { $match: { doctorId } },
      { $group: { _id: '$condition', count: { $sum: 1 } } },
    ]),
  ]);
  if (!doctor) throw notFound();

  const conditionCounts = Object.fromEntries(
    PATIENT_CONDITIONS.map((condition) => [condition, 0]),
  ) as Record<PatientCondition, number>;
  for (const row of rows) conditionCounts[row._id] = row.count;
  const patientCount = rows.reduce((sum, row) => sum + row.count, 0);

  return { ...toDoctor(doctor, patientCount), conditionCounts };
}

export async function createDoctor(input: DoctorInput): Promise<Doctor> {
  const doctor = await DoctorModel.create(input);
  return toDoctor(doctor, 0);
}

export async function updateDoctor(id: string, input: DoctorUpdate): Promise<Doctor> {
  const doctor = await DoctorModel.findById(id);
  if (!doctor) throw notFound();

  // set() + save() rather than findByIdAndUpdate: only save() runs the hook that
  // rebuilds `searchTokens` from the new name, email and phone.
  doctor.set(input);
  await doctor.save();

  const counts = await patientCountsFor([doctor._id]);
  return toDoctor(doctor, counts.get(doctor._id.toString()) ?? 0);
}

/**
 * Deleting a doctor never touches patients: while any are assigned the delete is
 * refused, and the client is told how many so they can be unassigned or moved first.
 * There is a small window between the check and the delete; closing it would need a
 * transaction (replica set), which isn't worth it for a single-admin tool.
 */
export async function deleteDoctor(id: string) {
  const patientCount = await PatientModel.countDocuments({ doctorId: id });
  if (patientCount > 0) {
    throw new HttpError(
      409,
      'DOCTOR_HAS_PATIENTS',
      `This doctor still has ${patientCount} assigned patient${patientCount === 1 ? '' : 's'}.`,
      { patientCount },
    );
  }
  const result = await DoctorModel.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw notFound();
}
