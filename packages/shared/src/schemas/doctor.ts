import { z } from 'zod';
import {
  DOCTOR_SORTS,
  type PatientCondition,
  SPECIALIZATIONS,
  type Specialization,
} from '../constants.js';
import {
  dateRangeQuerySchema,
  emailSchema,
  multiValue,
  paginationQuerySchema,
  phoneSchema,
  searchSchema,
} from './common.js';

export const doctorInputSchema = z.object({
  name: z.string('Enter a name').trim().min(1, 'Enter a name').min(2, 'Name is too short').max(100),
  specialization: z.enum(SPECIALIZATIONS, 'Pick a specialization'),
  hospital: z
    .string('Enter a hospital')
    .trim()
    .min(1, 'Enter a hospital')
    .min(2, 'Hospital is too short')
    .max(120),
  phone: phoneSchema,
  email: emailSchema,
});
export type DoctorInput = z.infer<typeof doctorInputSchema>;

export const doctorUpdateSchema = doctorInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');
export type DoctorUpdate = z.infer<typeof doctorUpdateSchema>;

export const doctorListQuerySchema = z
  .object({
    search: searchSchema,
    specialization: multiValue(z.enum(SPECIALIZATIONS)),
    hospital: multiValue(z.string().trim().min(1).max(120)),
    sort: z.enum(DOCTOR_SORTS).default('-createdAt'),
  })
  .extend(paginationQuerySchema.shape)
  .and(dateRangeQuerySchema);
export type DoctorListQuery = z.infer<typeof doctorListQuerySchema>;

export type Doctor = {
  id: string;
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DoctorDetail = Doctor & {
  conditionCounts: Record<PatientCondition, number>;
};

export type DoctorFilters = {
  specializations: Specialization[];
  hospitals: string[];
};
