export const USER_ROLES = ['admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PATIENT_CONDITIONS = [
  'stable',
  'recovering',
  'critical',
  'under_observation',
] as const;
export type PatientCondition = (typeof PATIENT_CONDITIONS)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'ENT',
  'Gastroenterology',
  'General Surgery',
  'Gynecology & Obstetrics',
  'Hematology',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Rheumatology',
  'Urology',
] as const;
export type Specialization = (typeof SPECIALIZATIONS)[number];

// `field` sorts ascending, `-field` descending. Only fields with a backing index are listed.
export const DOCTOR_SORTS = ['-createdAt', 'createdAt', 'name', '-name'] as const;
export type DoctorSort = (typeof DOCTOR_SORTS)[number];

export const PATIENT_SORTS = ['-admittedAt', 'admittedAt', 'name', '-name'] as const;
export type PatientSort = (typeof PATIENT_SORTS)[number];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
