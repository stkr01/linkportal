import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role, ROLES } from '../constants';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireRole } from '../middleware/auth';
import { writeAudit } from '../services/audit';

const router = Router();

// Alla user-routes kräver Admin.
router.use(authenticate, requireRole(Role.ADMIN));

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
};

// GET /api/users
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { username: 'asc' } });
    res.json(users);
  })
);

const createSchema = z.object({
  username: z.string().min(1).max(100),
  displayName: z.string().min(1).max(150),
  password: z.string().min(8, 'The password must be at least 8 characters.'),
  role: z.nativeEnum(Role),
});

// POST /api/users
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        passwordHash,
        role: data.role,
        mustChangePassword: true,
      },
      select: userSelect,
    });
    await writeAudit({
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      userId: req.user!.userId,
      newValue: { username: user.username, role: user.role },
    });
    res.status(201).json(user);
  })
);

const updateSchema = z.object({
  displayName: z.string().min(1).max(150).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

// PUT /api/users/:id – ändra roll, aktivera/inaktivera, återställ lösenord
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Skydd: hindra att man tar bort sin egen admin-roll eller inaktiverar sig själv.
    if (id === req.user!.userId) {
      if (data.role && data.role !== Role.ADMIN) {
        res.status(400).json({ error: 'You cannot downgrade your own admin account.' });
        return;
      }
      if (data.isActive === false) {
        res.status(400).json({ error: 'You cannot deactivate your own account.' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.newPassword) {
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
      updateData.mustChangePassword = true;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });
    await writeAudit({
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      userId: req.user!.userId,
      oldValue: { role: existing.role, isActive: existing.isActive },
      newValue: { role: user.role, isActive: user.isActive },
    });
    res.json(user);
  })
);

export default router;
