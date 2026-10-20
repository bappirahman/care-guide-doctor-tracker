import { DOCTOR_SORTS, SPECIALIZATIONS } from '@doctor-tracker/shared';
import { parseAsNativeArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { listParamsOptions, listParsers } from '@/lib/search-params';

// Repeated keys (?hospital=a&hospital=b) rather than a joined string: hospital
// names are free text and could contain any separator.
const doctorListParsers = {
  ...listParsers,
  specialization: parseAsNativeArrayOf(parseAsStringLiteral(SPECIALIZATIONS)),
  hospital: parseAsNativeArrayOf(parseAsString),
  sort: parseAsStringLiteral(DOCTOR_SORTS).withDefault('-createdAt'),
};

export function useDoctorListParams() {
  return useQueryStates(doctorListParsers, listParamsOptions);
}

export type DoctorListParams = ReturnType<typeof useDoctorListParams>[0];
