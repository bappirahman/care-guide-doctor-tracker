import {
  doctorInputSchema,
  doctorListQuerySchema,
  doctorUpdateSchema,
  idParamsSchema,
} from '@doctor-tracker/shared';
import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';

export const doctorRouter = Router();

doctorRouter.get('/', validate({ query: doctorListQuerySchema }), controller.list);
// Registered before /:id so "filters" is never read as an id.
doctorRouter.get('/filters', controller.filters);
doctorRouter.post('/', validate({ body: doctorInputSchema }), controller.create);
doctorRouter.get('/:id', validate({ params: idParamsSchema }), controller.get);
doctorRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: doctorUpdateSchema }),
  controller.update,
);
doctorRouter.delete('/:id', validate({ params: idParamsSchema }), controller.remove);
