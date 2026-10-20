import {
  type Gender,
  type ListResponse,
  type Patient,
  type PatientCondition,
  type PatientInputParsed,
  type PatientListQuery,
  type PatientUpdate,
  UNASSIGNED,
} from '@doctor-tracker/shared';
import { Types } from 'mongoose';
import { HttpError } from '../../lib/http-error.js';
import { dateRangeFilter, paginationMeta, skipFor, sortSpec } from '../../lib/list-query.js';
import { searchFilter } from '../../lib/search.js';
import { DoctorModel } from '../doctors/model.js';
import { PatientModel } from './model.js';

type PatientFields = {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId | null;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  condition: PatientCondition;
  admittedAt: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

const notFound = () => new HttpError(404, 'NOT_FOUND', 'Patient not found');

/**
 * A reference to a doctor that no longer exists (deleted between the guard check
 * and the delete) is shown as unassigned rather than breaking the row.
 */
function toPatient(patient: PatientFields, doctorNames: Map<string, string>): Patient {
  const doctorId = patient.doctorId?.toString();
  const doctorName = doctorId ? doctorNames.get(doctorId) : undefined;
  return {
    id: patient._id.toString(),
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    condition: patient.condition,
    admittedAt: patient.admittedAt.toISOString(),
    notes: patient.notes,
    doctor: doctorId && doctorName ? { id: doctorId, name: doctorName } : null,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

// One query for every doctor on the page, by _id.
async function doctorNamesFor(patients: PatientFields[]) {
  const ids = [...new Set(patients.flatMap((patient) => patient.doctorId?.toString() ?? []))];
  if (ids.length === 0) return new Map<string, string>();
  const doctors = await DoctorModel.find({ _id: { $in: ids } }, { name: 1 }).lean<
    { _id: Types.ObjectId; name: string }[]
  >();
  return new Map(doctors.map((doctor) => [doctor._id.toString(), doctor.name]));
}

/** Exported so the explain script inspects the exact query the list endpoint runs. */
export function patientListQuery(query: PatientListQuery) {
  const doctorFilter =
    query.doctorId === undefined
      ? {}
      : { doctorId: query.doctorId === UNASSIGNED ? null : new Types.ObjectId(query.doctorId) };

  const filter = {
    ...searchFilter(query.search),
    ...(query.condition?.length ? { condition: { $in: query.condition } } : {}),
    ...doctorFilter,
    ...dateRangeFilter('admittedAt', query.from, query.to),
  };
  return { filter, ...sortSpec(query.sort) };
}

export async function listPatients(query: PatientListQuery): Promise<ListResponse<Patient>> {
  const { filter, sort, collation } = patientListQuery(query);

  const pageQuery = PatientModel.find(filter)
    .sort(sort)
    .skip(skipFor(query.page, query.limit))
    .limit(query.limit)
    .lean<PatientFields[]>();
  if (collation) pageQuery.collation(collation);

  const [total, patients] = await Promise.all([PatientModel.countDocuments(filter), pageQuery]);
  const doctorNames = await doctorNamesFor(patients);

  return {
    data: patients.map((patient) => toPatient(patient, doctorNames)),
    meta: paginationMeta(query.page, query.limit, total),
  };
}

async function withDoctor(patient: PatientFields) {
  return toPatient(patient, await doctorNamesFor([patient]));
}

// A dangling doctorId would silently render as "unassigned", so it's refused up front.
async function assertDoctorExists(doctorId: string | null | undefined) {
  if (!doctorId) return;
  if (!(await DoctorModel.exists({ _id: doctorId }))) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The request is invalid', [
      { location: 'body', path: 'doctorId', message: 'That doctor no longer exists' },
    ]);
  }
}

export async function getPatient(id: string): Promise<Patient> {
  const patient = await PatientModel.findById(id).lean<PatientFields>();
  if (!patient) throw notFound();
  return withDoctor(patient);
}

export async function createPatient(input: PatientInputParsed): Promise<Patient> {
  await assertDoctorExists(input.doctorId);
  const patient = await PatientModel.create(input);
  return withDoctor(patient.toObject<PatientFields>());
}

export async function updatePatient(id: string, input: PatientUpdate): Promise<Patient> {
  await assertDoctorExists(input.doctorId);
  const patient = await PatientModel.findById(id);
  if (!patient) throw notFound();

  // set() + save() so the searchTokens hook sees the new name and phone.
  patient.set(input);
  await patient.save();
  return withDoctor(patient.toObject<PatientFields>());
}

export async function deletePatient(id: string) {
  const result = await PatientModel.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw notFound();
}
