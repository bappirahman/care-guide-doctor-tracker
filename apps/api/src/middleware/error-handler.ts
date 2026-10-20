import type { ApiErrorBody } from '@doctor-tracker/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = toHttpError(err);

  if (error.status >= 500) {
    req.log.error({ err }, 'Unhandled error');
  }

  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
  res.status(error.status).json(body);
};

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;

  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const fields = Object.keys((err.keyPattern ?? {}) as Record<string, unknown>);
    return fields.includes('email')
      ? new HttpError(409, 'DUPLICATE_EMAIL', 'That email is already in use', { fields })
      : new HttpError(409, 'CONFLICT', 'A record with these values already exists', { fields });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const issues = Object.values(err.errors).map((issue) => ({
      location: 'body',
      path: issue.path,
      message: issue.message,
    }));
    return new HttpError(400, 'VALIDATION_ERROR', 'The request is invalid', issues);
  }

  // body-parser errors (malformed JSON, payload too large) carry a safe 4xx status.
  if (isClientError(err)) {
    return new HttpError(err.status, 'VALIDATION_ERROR', err.message);
  }

  return new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong');
}

function isClientError(err: unknown): err is { status: number; message: string } {
  if (typeof err !== 'object' || err === null) return false;
  const { status, expose } = err as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}
