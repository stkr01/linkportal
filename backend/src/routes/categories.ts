import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '../constants';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireRole } from '../middleware/auth';
import { writeAudit } from '../services/audit';

const router = Router();

interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  linkCount: number;
  children: CategoryNode[];
}

// Bygg ett träd från en platt lista.
function buildTree(
  categories: { id: number; name: string; parentId: number | null; sortOrder: number }[],
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

// GET /api/categories – hela trädet (alla inloggade)
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, parentId: true, sortOrder: true },
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
});

// POST /api/categories – endast Admin
router.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const data = createSchema.parse(req.body);

    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        res.status(400).json({ error: 'The parent category does not exist.' });
        return;
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
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

// PUT /api/categories/:id – endast Admin
router.put(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    // Förhindra att en kategori blir sin egen förälder.
    if (data.parentId === id) {
      res.status(400).json({ error: 'A category cannot be its own parent.' });
      return;
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

// DELETE /api/categories/:id – endast Admin, bara om tom
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

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

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
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
