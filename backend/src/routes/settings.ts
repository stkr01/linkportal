import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '../constants';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireRole } from '../middleware/auth';
import { getSettings, updateSettings } from '../services/settings';
import { writeAudit } from '../services/audit';

const router = Router();

// GET /api/settings – alla inloggade får läsa (frontend behöver veta om health-check är på)
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await getSettings());
  })
);

const updateSchema = z.object({
  healthCheckEnabled: z.boolean().optional(),
  healthCheckIntervalHours: z.number().int().min(1).max(168).optional(),
  healthCheckTimeoutSec: z.number().int().min(1).max(60).optional(),
  healthRetentionDays: z.number().int().min(0).max(3650).optional(),
});

// PUT /api/settings – endast Admin
router.put(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateSchema.parse(req.body);
    const settings = await updateSettings(data);

    await writeAudit({
      action: 'UPDATE_SETTINGS',
      entity: 'Settings',
      entityId: 1,
      userId: req.user!.userId,
      newValue: data,
    });

    res.json(settings);
  })
);

export default router;
