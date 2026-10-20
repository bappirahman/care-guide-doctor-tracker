import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client';

type Issue = { location?: string; path?: string; message?: string };

/**
 * Puts API errors next to the field they belong to: the 400 issue list from the
 * validator, and the 409 a unique email produces. Returns false when the error
 * isn't about a field, so the caller can toast instead.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError)) return false;

  if (error.code === 'DUPLICATE_EMAIL' && fields.includes('email' as Path<T>)) {
    setError('email' as Path<T>, { message: error.message }, { shouldFocus: true });
    return true;
  }

  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    const issues = (error.details as Issue[]).filter(
      (issue): issue is Issue & { path: Path<T> } =>
        issue.location === 'body' && fields.includes(issue.path as Path<T>),
    );
    issues.forEach((issue, index) =>
      setError(
        issue.path,
        { message: issue.message ?? 'Invalid value' },
        { shouldFocus: index === 0 },
      ),
    );
    return issues.length > 0;
  }

  return false;
}
