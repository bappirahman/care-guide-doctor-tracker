import { PATIENT_CONDITIONS, PATIENT_SORTS } from '@doctor-tracker/shared';
import { parseAsNativeArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { listParamsOptions, listParsers } from '@/lib/search-params';

const patientListParsers = {
  ...listParsers,
  condition: parseAsNativeArrayOf(parseAsStringLiteral(PATIENT_CONDITIONS)),
  // A doctor id, or "unassigned".
  doctor: parseAsString,
  sort: parseAsStringLiteral(PATIENT_SORTS).withDefault('-admittedAt'),
};

export function usePatientListParams() {
  return useQueryStates(patientListParsers, listParamsOptions);
}

export type PatientListParams = ReturnType<typeof usePatientListParams>[0];
