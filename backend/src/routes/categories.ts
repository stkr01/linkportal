import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { Role } from '../constants';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireRole } from '../middleware/auth';
import { writeAudit } from '../services/audit';

const router = Router();

// Non-admins see shared categories plus their own private ones; admins see everything.
function categoryVisibilityWhere(user: { userId: number; role: string }): Prisma.CategoryWhereInput {
  if (user.role === Role.ADMIN) return {};
  return { OR: [{ isPrivate: false }, { ownerId: user.userId }] };
}

interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  linkCount: number;
  isPrivate: boolean;
  ownerId: number | null;
  children: CategoryNode[];
}

// Bygg ett träd från en platt lista.
function buildTree(
  categories: {
    id: number;
    name: string;
    parentId: number | null;
    sortOrder: number;
    isPrivate: boolean;
    ownerId: number | null;
  }[],
  linkCounts: Map<number, number>
): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const c of categories) {
    map.set(c.id, { ...c, linkCount: linkCounts.get(c.id) ?? 0, children: [] });
  }
  for (const c of categories) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'en'));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  // Rulla upp länkantal: en kategoris count = direkta länkar + alla underkategoriers länkar.
  const aggregate = (node: CategoryNode): number => {
    const childTotal = node.children.reduce((sum, c) => sum + aggregate(c), 0);
    node.linkCount += childTotal;
    return node.linkCount;
  };
  roots.forEach(aggregate);

  return roots;
}

// GET /api/categories – hela trädet (alla inloggade; privata kategorier filtreras per användare)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      where: categoryVisibilityWhere(req.user!),
      select: { id: true, name: true, parentId: true, sortOrder: true, isPrivate: true, ownerId: true },
    });
    const grouped = await prisma.link.groupBy({
      by: ['categoryId'],
      where: { isDeleted: false },
      _count: { _all: true },
    });
    const linkCounts = new Map<number, number>();
    grouped.forEach((g) => linkCounts.set(g.categoryId, g._count._all));

    res.json(buildTree(categories, linkCounts));
  })
);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isPrivate: z.boolean().optional(),
});

// POST /api/categories – Editor+ (skapar delade eller privata kategorier)
router.post(
  '/',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const data = createSchema.parse(req.body);

    let isPrivate = false;
    let ownerId: number | null = null;

    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      // Dölj existensen av kategorier användaren inte får se.
      if (
        !parent ||
        (parent.isPrivate && parent.ownerId !== req.user!.userId && req.user!.role !== Role.ADMIN)
      ) {
        res.status(400).json({ error: 'The parent category does not exist.' });
        return;
      }
      // Underkategorier ärver alltid förälderns privathet och ägare.
      isPrivate = parent.isPrivate;
      ownerId = parent.ownerId;
    } else {
      // Rotkategori: respektera önskad privathet; skaparen blir ägare.
      isPrivate = data.isPrivate ?? false;
      ownerId = isPrivate ? req.user!.userId : null;
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
        isPrivate,
        ownerId,
      },
    });
    await writeAudit({
      action: 'CREATE_CATEGORY',
      entity: 'Category',
      entityId: category.id,
      userId: req.user!.userId,
      newValue: category,
    });
    res.status(201).json(category);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

// PUT /api/categories/:id – admins hanterar alla; editors bara sina egna privata
router.put(
  '/:id',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const isAdmin = req.user!.role === Role.ADMIN;
    const ownsPrivate = existing.isPrivate && existing.ownerId === req.user!.userId;
    if (!isAdmin && !ownsPrivate) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }

    // Förhindra att en kategori blir sin egen förälder.
    if (data.parentId === id) {
      res.status(400).json({ error: 'A category cannot be its own parent.' });
      return;
    }

    // En flytt till en ny förälder får inte ändra kategorins privathet (sätts bara vid skapandet).
    if (data.parentId !== undefined && data.parentId !== existing.parentId && data.parentId !== null) {
      const newParent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!newParent || (!isAdmin && newParent.isPrivate && newParent.ownerId !== req.user!.userId)) {
        res.status(400).json({ error: 'The parent category does not exist.' });
        return;
      }
      const samePrivacy =
        newParent.isPrivate === existing.isPrivate &&
        (!existing.isPrivate || newParent.ownerId === existing.ownerId);
      if (!samePrivacy) {
        res.status(400).json({ error: "A category's privacy cannot be changed after creation." });
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        parentId: data.parentId === undefined ? existing.parentId : data.parentId,
        sortOrder: data.sortOrder ?? existing.sortOrder,
      },
    });
    await writeAudit({
      action: 'UPDATE_CATEGORY',
      entity: 'Category',
      entityId: id,
      userId: req.user!.userId,
      oldValue: existing,
      newValue: category,
    });
    res.json(category);
  })
);

// DELETE /api/categories/:id – admins raderar alla tomma; editors bara sina egna privata (tomma)
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const isAdmin = req.user!.role === Role.ADMIN;
    const ownsPrivate = existing.isPrivate && existing.ownerId === req.user!.userId;
    if (!isAdmin && !ownsPrivate) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }

    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      res.status(409).json({ error: 'The category has subcategories. Move or remove them first.' });
      return;
    }
    const linkCount = await prisma.link.count({ where: { categoryId: id, isDeleted: false } });
    if (linkCount > 0) {
      res.status(409).json({ error: 'The category contains links. Move or remove them first.' });
      return;
    }

    await prisma.category.delete({ where: { id } });
    await writeAudit({
      action: 'DELETE_CATEGORY',
      entity: 'Category',
      entityId: id,
      userId: req.user!.userId,
      oldValue: existing,
    });
    res.json({ ok: true });
  })
);

export default router;
