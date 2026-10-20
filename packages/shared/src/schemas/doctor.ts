import { z } from 'zod';
import { SPECIALIZATIONS, type Specialization } from '../constants.js';
import {
  dateRangeQuerySchema,
  emailSchema,
  multiValue,
  paginationQuerySchema,
  phoneSchema,
  searchSchema,
  sortQuerySchema,
} from './common.js';

export const doctorInputSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  specialization: z.enum(SPECIALIZATIONS, 'Pick a specialization'),
  hospital: z.string().trim().min(2, 'Hospital is too short').max(120),
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
  })
  .extend(paginationQuerySchema.shape)
  .extend(sortQuerySchema.shape)
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

export type DoctorFilters = {
  specializations: Specialization[];
  hospitals: string[];
};
