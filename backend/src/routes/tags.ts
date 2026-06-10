import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/error';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/tags – lista alla taggar (sorterade på namn), för filter-UI.
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const tags = await prisma.tag.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  })
);

export default router;
