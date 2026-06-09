import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { Role, Environment, LinkStatus } from '../constants';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireRole } from '../middleware/auth';
import { writeAudit } from '../services/audit';

const router = Router();

function linkIncludeFor(userId: number) {
  return {
    category: { select: { id: true, name: true, parentId: true } },
    tags: { select: { id: true, name: true } },
    addedBy: { select: { id: true, displayName: true, username: true } },
    modifiedBy: { select: { id: true, displayName: true, username: true } },
    favoritedBy: { where: { userId }, select: { userId: true } },
  } satisfies Prisma.LinkInclude;
}

// Plana ut den per-användare-beräknade favoritmarkeringen till ett boolean-fält.
function serializeLink<T extends { favoritedBy: unknown[] }>(link: T) {
  const { favoritedBy, ...rest } = link;
  return { ...rest, isFavorite: favoritedBy.length > 0 };
}

// Hämta alla descendant-kategori-id (för att inkludera underkategoriers länkar).
async function getCategoryAndDescendants(categoryId: number): Promise<number[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<number, number[]>();
  for (const c of all) {
    if (c.parentId !== null) {
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
  }
  const result: number[] = [];
  const stack = [categoryId];
  while (stack.length) {
    const cur = stack.pop()!;
    result.push(cur);
    const kids = childrenOf.get(cur);
    if (kids) stack.push(...kids);
  }
  return result;
}

// GET /api/links?categoryId=&q=&includeDescendants=true
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const includeDescendants = req.query.includeDescendants !== 'false';

    const where: Prisma.LinkWhereInput = { isDeleted: false };

    if (categoryId) {
      if (includeDescendants) {
        const ids = await getCategoryAndDescendants(categoryId);
        where.categoryId = { in: ids };
      } else {
        where.categoryId = categoryId;
      }
    }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { manageSoftware: { contains: q } },
        { url: { contains: q } },
        { owningTeam: { contains: q } },
        { tags: { some: { name: { contains: q } } } },
      ];
    }

    const links = await prisma.link.findMany({
      where,
      include: linkIncludeFor(req.user!.userId),
      orderBy: { name: 'asc' },
    });
    res.json(links.map(serializeLink));
  })
);

// GET /api/links/:id
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const link = await prisma.link.findFirst({
      where: { id, isDeleted: false },
      include: linkIncludeFor(req.user!.userId),
    });
    if (!link) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }
    res.json(serializeLink(link));
  })
);

const upsertSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url('Invalid URL (must start with http:// or https://).'),
  categoryId: z.number().int(),
  manageSoftware: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url('Invalid image URL.').max(2000).optional().nullable().or(z.literal('')),
  environment: z.nativeEnum(Environment).optional(),
  owningTeam: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(LinkStatus).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

// Koppla taggar (skapa de som saknas) och returnera connect-array.
async function resolveTags(tagNames: string[]) {
  const unique = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)));
  const connect: { id: number }[] = [];
  for (const name of unique) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    connect.push({ id: tag.id });
  }
  return connect;
}

// PATCH /api/links/:id/favorite – personlig favorit för inloggad användare (alla roller)
const favoriteSchema = z.object({ isFavorite: z.boolean() });

router.patch(
  '/:id/favorite',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { isFavorite } = favoriteSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.link.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }

    if (isFavorite) {
      await prisma.userFavorite.upsert({
        where: { userId_linkId: { userId, linkId: id } },
        update: {},
        create: { userId, linkId: id },
      });
    } else {
      await prisma.userFavorite.deleteMany({ where: { userId, linkId: id } });
    }

    const link = await prisma.link.findFirst({
      where: { id },
      include: linkIncludeFor(userId),
    });
    res.json(serializeLink(link!));
  })
);

// POST /api/links/quick-save – snabbspara aktuell flik från tillägget (Editor+)
const quickSaveSchema = z.object({
  url: z.string().url('Invalid URL.'),
  name: z.string().max(200).optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
});

const INBOX_NAME = '📥 Inbox';
const LEGACY_INBOX_NAME = '📥 Inkorg';

router.post(
  '/quick-save',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const data = quickSaveSchema.parse(req.body);

    let categoryId = data.categoryId ?? null;
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) {
        res.status(400).json({ error: 'The selected category does not exist.' });
        return;
      }
    } else {
      // Find or create the system "Inbox" category (top level), migrating the legacy Swedish name if present.
      let inbox = await prisma.category.findFirst({
        where: { name: { in: [INBOX_NAME, LEGACY_INBOX_NAME] }, parentId: null },
      });
      if (!inbox) {
        inbox = await prisma.category.create({ data: { name: INBOX_NAME, sortOrder: 999 } });
      } else if (inbox.name === LEGACY_INBOX_NAME) {
        inbox = await prisma.category.update({ where: { id: inbox.id }, data: { name: INBOX_NAME } });
      }
      categoryId = inbox.id;
    }

    // Namn: angivet, annars värdnamnet från URL:en.
    let name = (data.name ?? '').trim();
    if (!name) {
      try {
        name = new URL(data.url).hostname;
      } catch {
        name = data.url;
      }
    }

    const link = await prisma.link.create({
      data: {
        name: name.slice(0, 200),
        url: data.url,
        categoryId,
        addedById: req.user!.userId,
      },
      include: linkIncludeFor(req.user!.userId),
    });

    await writeAudit({
      action: 'QUICK_SAVE_LINK',
      entity: 'Link',
      entityId: link.id,
      userId: req.user!.userId,
      newValue: { name: link.name, url: link.url, categoryId },
    });

    res.status(201).json(serializeLink(link));
  })
);

// POST /api/links – Editor+
router.post(
  '/',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const data = upsertSchema.parse(req.body);

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      res.status(400).json({ error: 'The selected category does not exist.' });
      return;
    }

    const tagConnect = data.tags ? await resolveTags(data.tags) : [];

    const link = await prisma.link.create({
      data: {
        name: data.name,
        url: data.url,
        categoryId: data.categoryId,
        manageSoftware: data.manageSoftware ?? null,
        description: data.description ?? null,
        imageUrl: data.imageUrl ? data.imageUrl : null,
        environment: data.environment ?? Environment.NA,
        owningTeam: data.owningTeam ?? null,
        status: data.status ?? LinkStatus.ACTIVE,
        addedById: req.user!.userId,
        tags: { connect: tagConnect },
      },
      include: linkIncludeFor(req.user!.userId),
    });

    await writeAudit({
      action: 'CREATE_LINK',
      entity: 'Link',
      entityId: link.id,
      userId: req.user!.userId,
      newValue: { name: link.name, url: link.url, categoryId: link.categoryId },
    });

    res.status(201).json(serializeLink(link));
  })
);

// PUT /api/links/:id – Editor+
router.put(
  '/:id',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = upsertSchema.parse(req.body);

    const existing = await prisma.link.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      res.status(400).json({ error: 'The selected category does not exist.' });
      return;
    }

    const tagConnect = data.tags ? await resolveTags(data.tags) : [];

    const link = await prisma.link.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        categoryId: data.categoryId,
        manageSoftware: data.manageSoftware ?? null,
        description: data.description ?? null,
        imageUrl: data.imageUrl ? data.imageUrl : null,
        environment: data.environment ?? Environment.NA,
        owningTeam: data.owningTeam ?? null,
        status: data.status ?? LinkStatus.ACTIVE,
        modifiedById: req.user!.userId,
        // ersätt taggar
        tags: { set: [], connect: tagConnect },
      },
      include: linkIncludeFor(req.user!.userId),
    });

    await writeAudit({
      action: 'UPDATE_LINK',
      entity: 'Link',
      entityId: id,
      userId: req.user!.userId,
      oldValue: { name: existing.name, url: existing.url, categoryId: existing.categoryId },
      newValue: { name: link.name, url: link.url, categoryId: link.categoryId },
    });

    res.json(serializeLink(link));
  })
);

// DELETE /api/links/:id – endast ADMIN (soft delete)
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.link.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }

    await prisma.link.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await writeAudit({
      action: 'DELETE_LINK',
      entity: 'Link',
      entityId: id,
      userId: req.user!.userId,
      oldValue: { name: existing.name, url: existing.url },
    });

    res.json({ ok: true });
  })
);

export default router;
