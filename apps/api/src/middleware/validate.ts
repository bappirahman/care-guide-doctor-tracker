import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../lib/http-error.js';

type RequestSchemas = {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
};

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * Parses each request location with its schema and replaces the raw value with
 * the parsed one, so handlers receive coerced numbers, dates and defaults.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const issues = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join('.'), message: issue.message });
        }
        continue;
      }

      // Express 5 exposes `req.query` as a getter, so it has to be redefined, not assigned.
      Object.defineProperty(req, location, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (issues.length > 0) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The request is invalid', issues);
    }
    next();
  };
}
