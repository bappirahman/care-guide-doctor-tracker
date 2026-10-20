import type { RequestHandler } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
import type { output, ZodType } from 'zod';
import { HttpError } from '../lib/http-error.js';

type RequestSchemas = {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
};

type Parsed<S, Fallback> = S extends ZodType ? output<S> : Fallback;

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * Parses each request location with its schema and replaces the raw value with
 * the parsed one, so handlers receive coerced numbers, dates and defaults. The
 * returned handler carries the parsed types, which Express then infers for the
 * controller registered after it on the same route.
 */
export function validate<S extends RequestSchemas>(
  schemas: S,
): RequestHandler<
  Parsed<S['params'], ParamsDictionary>,
  unknown,
  Parsed<S['body'], unknown>,
  Parsed<S['query'], Query>
> {
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
