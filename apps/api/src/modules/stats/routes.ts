import { statsQuerySchema } from '@doctor-tracker/shared';
import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';

export const statsRouter = Router();

statsRouter.get('/overview', validate({ query: statsQuerySchema }), controller.overview);
