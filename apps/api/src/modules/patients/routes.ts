import {
  idParamsSchema,
  patientInputSchema,
  patientListQuerySchema,
  patientUpdateSchema,
} from '@doctor-tracker/shared';
import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';

export const patientRouter = Router();

patientRouter.get('/', validate({ query: patientListQuerySchema }), controller.list);
patientRouter.post('/', validate({ body: patientInputSchema }), controller.create);
patientRouter.get('/:id', validate({ params: idParamsSchema }), controller.get);
// Also how a patient is unassigned (`{ doctorId: null }`) or moved to another doctor.
patientRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: patientUpdateSchema }),
  controller.update,
);
patientRouter.delete('/:id', validate({ params: idParamsSchema }), controller.remove);
