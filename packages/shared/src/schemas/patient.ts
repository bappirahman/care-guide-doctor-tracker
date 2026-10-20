import { z } from 'zod';
import { GENDERS, PATIENT_CONDITIONS, type Gender, type PatientCondition } from '../constants.js';
import {
  dateRangeQuerySchema,
  multiValue,
  objectIdSchema,
  paginationQuerySchema,
  phoneSchema,
  searchSchema,
  sortQuerySchema,
} from './common.js';

export const UNASSIGNED = 'unassigned';

const patientFields = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  age: z.coerce.number().int('Age must be a whole number').min(0).max(120),
  gender: z.enum(GENDERS, 'Pick a gender'),
  phone: phoneSchema,
  condition: z.enum(PATIENT_CONDITIONS, 'Pick a condition'),
  admittedAt: z.coerce
    .date('Enter the admission date')
    .refine((date) => date.getTime() <= Date.now(), 'Admission date cannot be in the future'),
  notes: z.string().trim().max(2000),
  doctorId: objectIdSchema.nullable(),
});

export const patientInputSchema = patientFields.extend({
  notes: patientFields.shape.notes.default(''),
  doctorId: patientFields.shape.doctorId.default(null),
});
export type PatientInput = z.input<typeof patientInputSchema>;
export type PatientInputParsed = z.output<typeof patientInputSchema>;

// Built from the default-free fields: a PATCH must never fill in `doctorId: null`
// for a key the client didn't send, or every edit would unassign the doctor.
export const patientUpdateSchema = patientFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');
export type PatientUpdate = z.output<typeof patientUpdateSchema>;

export const patientListQuerySchema = z
  .object({
    search: searchSchema,
    condition: multiValue(z.enum(PATIENT_CONDITIONS)),
    doctorId: z.union([objectIdSchema, z.literal(UNASSIGNED)]).optional(),
  })
  .extend(paginationQuerySchema.shape)
  .extend(sortQuerySchema.shape)
  .and(dateRangeQuerySchema);
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  condition: PatientCondition;
  admittedAt: string;
  notes: string;
  doctor: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};
