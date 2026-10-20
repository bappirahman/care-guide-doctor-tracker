import { z } from 'zod';
import {
  GENDERS,
  PATIENT_CONDITIONS,
  PATIENT_SORTS,
  type Gender,
  type PatientCondition,
} from '../constants.js';
import {
  dateRangeQuerySchema,
  multiValue,
  objectIdSchema,
  paginationQuerySchema,
  phoneSchema,
  searchSchema,
} from './common.js';

export const UNASSIGNED = 'unassigned';

const patientFields = z.object({
  name: z.string('Enter a name').trim().min(1, 'Enter a name').min(2, 'Name is too short').max(100),
  age: z.coerce
    .number('Enter an age')
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(120, 'Age looks too high'),
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
    sort: z.enum(PATIENT_SORTS).default('-admittedAt'),
  })
  .extend(paginationQuerySchema.shape)
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
