import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORT_OPTIONS } from '../constants.js';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

export const idParamsSchema = z.object({ id: objectIdSchema });

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

// Digits with an optional leading +, allowing the spaces and dashes people type.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s-]{7,20}$/, 'Enter a valid phone number');

export const searchSchema = z.string().trim().max(100).optional();

/**
 * Accepts `?key=a&key=b` (Express parses repeated keys into an array) as well
 * as a single `?key=a`, so clients never have to invent a separator.
 */
export const multiValue = <T extends z.ZodType>(item: T) =>
  z
    .union([item, z.array(item)])
    .transform((value) => (Array.isArray(value) ? value : [value]) as z.output<T>[])
    .optional();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Over-large limits are clamped rather than rejected so a hand-edited URL still works.
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_PAGE_SIZE)
    .transform((value) => Math.min(value, MAX_PAGE_SIZE)),
});

export const dateRangeQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: '`from` must be before `to`',
    path: ['from'],
  });

export const sortQuerySchema = z.object({
  sort: z.enum(SORT_OPTIONS).default('newest'),
});

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListResponse<T> = { data: T[]; meta: PaginationMeta };
export type ItemResponse<T> = { data: T };

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_EMAIL',
  'DOCTOR_HAS_PATIENTS',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};
