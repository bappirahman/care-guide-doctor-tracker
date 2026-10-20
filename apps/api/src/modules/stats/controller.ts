import type { DashboardStats, ItemResponse, StatsQuery } from '@doctor-tracker/shared';
import type { Request, Response } from 'express';
import * as statsService from './service.js';

export async function overview(
  req: Request<Record<string, never>, unknown, unknown, StatsQuery>,
  res: Response<ItemResponse<DashboardStats>>,
) {
  res.json({ data: await statsService.getOverview(req.query) });
}
