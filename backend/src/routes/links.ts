import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { Role, Environment, ENVIRONMENTS, LinkStatus } from '../constants';
import { prisma } from '../db';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireRole } from '../middleware/auth';
import { writeAudit } from '../services/audit';
import { runCheck, runChecks } from '../services/healthcheck';
import { getSettings } from '../services/settings';

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

    // Filter: environment (komma-separerad lista av giltiga miljöer)
    const envParam = typeof req.query.environment === 'string' ? req.query.environment : '';
    const environments = envParam
      .split(',')
      .map((e) => e.trim())
      .filter((e): e is Environment => (ENVIRONMENTS as readonly string[]).includes(e));

    // Filter: taggar (komma-separerad lista av tag-id)
    const tagsParam = typeof req.query.tags === 'string' ? req.query.tags : '';
    const tagIds = tagsParam
      .split(',')
      .map((t) => Number(t.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    const where: Prisma.LinkWhereInput = { isDeleted: false };

    if (categoryId) {
      if (includeDescendants) {
        const ids = await getCategoryAndDescendants(categoryId);
        where.categoryId = { in: ids };
      } else {
        where.categoryId = categoryId;
      }
    }

    if (environments.length) {
      where.environment = { in: environments };
    }

    if (tagIds.length) {
      where.tags = { some: { id: { in: tagIds } } };
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

// GET /api/links/deleted – list soft-deleted links (ADMIN). Declared before '/:id' so 'deleted' is not captured as an id.
router.get(
  '/deleted',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const links = await prisma.link.findMany({
      where: { isDeleted: true },
      include: linkIncludeFor(req.user!.userId),
      orderBy: { deletedAt: 'desc' },
    });
    res.json(links.map(serializeLink));
  })
);

// GET /api/links/export – export all (non-deleted) links as portable JSON (any authenticated user).
// Declared before '/:id' so 'export' is not captured as an id. Links carry their category PATH
// (array of names from root to leaf) and tag names, so the export is portable between instances.
router.get(
  '/export',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const byId = new Map(categories.map((c) => [c.id, c]));
    const pathOf = (categoryId: number): string[] => {
      const path: string[] = [];
      let cur = byId.get(categoryId);
      let guard = 0;
      while (cur && guard++ < 100) {
        path.unshift(cur.name);
        cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
      }
      return path;
    };

    const links = await prisma.link.findMany({
      where: { isDeleted: false },
      include: { tags: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    const exported = links.map((l) => ({
      name: l.name,
      url: l.url,
      categoryPath: pathOf(l.categoryId),
      manageSoftware: l.manageSoftware,
      description: l.description,
      imageUrl: l.imageUrl,
      environment: l.environment,
      owningTeam: l.owningTeam,
      status: l.status,
      tags: l.tags.map((t) => t.name),
      doNotMonitor: l.doNotMonitor,
      extraMonitor: l.extraMonitor,
      extraMonitorMinutes: l.extraMonitorMinutes,
    }));

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      count: exported.length,
      links: exported,
    });
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
  url: z.string().url('Invalid URL. Include a scheme such as https://, rdp:// or ssh:// (e.g. rdp://10.0.0.5).'),
  categoryId: z.number().int(),
  manageSoftware: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url('Invalid image URL.').max(2000).optional().nullable().or(z.literal('')),
  environment: z.nativeEnum(Environment).optional(),
  owningTeam: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(LinkStatus).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  doNotMonitor: z.boolean().optional(),
  extraMonitor: z.boolean().optional(),
  extraMonitorMinutes: z.number().int().min(1).max(1440).optional().nullable(),
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
        doNotMonitor: data.doNotMonitor ?? false,
        extraMonitor: data.extraMonitor ?? false,
        extraMonitorMinutes: data.extraMonitor ? data.extraMonitorMinutes ?? null : null,
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
        doNotMonitor: data.doNotMonitor ?? false,
        // När övervakning stängs av: nollställ ev. aktivt larm så länken inte ligger kvar i Övervakningslarm.
        ...(data.doNotMonitor ? { alertActive: false } : {}),
        extraMonitor: data.extraMonitor ?? false,
        extraMonitorMinutes: data.extraMonitor ? data.extraMonitorMinutes ?? null : null,
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

// POST /api/links/:id/restore – restore a soft-deleted link (ADMIN)
router.post(
  '/:id/restore',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.link.findFirst({ where: { id, isDeleted: true } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }

    const link = await prisma.link.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      include: linkIncludeFor(req.user!.userId),
    });

    await writeAudit({
      action: 'RESTORE_LINK',
      entity: 'Link',
      entityId: id,
      userId: req.user!.userId,
      newValue: { name: existing.name, url: existing.url },
    });

    res.json(serializeLink(link));
  })
);

// DELETE /api/links/:id/permanent – permanently remove an already soft-deleted link (ADMIN)
router.delete(
  '/:id/permanent',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.link.findFirst({ where: { id, isDeleted: true } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }

    // HealthCheck and UserFavorite rows cascade automatically (onDelete: Cascade); tag join rows are removed by Prisma.
    await prisma.link.delete({ where: { id } });

    await writeAudit({
      action: 'PERMANENT_DELETE_LINK',
      entity: 'Link',
      entityId: id,
      userId: req.user!.userId,
      oldValue: { name: existing.name, url: existing.url },
    });

    res.json({ ok: true });
  })
);

// POST /api/links/test-all – kör health-check på länkar nu (Editor+)
// Body { ids?: number[] } – om ids anges testas bara dessa, annars alla länkar.
const testAllSchema = z.object({ ids: z.array(z.number().int()).optional() });

router.post(
  '/test-all',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const { ids } = testAllSchema.parse(req.body ?? {});
    const settings = await getSettings();
    const links = await prisma.link.findMany({
      where: { isDeleted: false, doNotMonitor: false, ...(ids && ids.length ? { id: { in: ids } } : {}) },
      select: { id: true, url: true },
    });
    await runChecks(links, settings.healthCheckTimeoutSec);
    res.json({ ok: true, tested: links.length });
  })
);

// POST /api/links/:id/test – testa en länk omedelbart (Editor+)
router.post(
  '/:id/test',
  authenticate,
  requireRole(Role.EDITOR),
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.link.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, url: true, doNotMonitor: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Link not found.' });
      return;
    }

    // Övervakning avstängd för länken: kör inget test, returnera den som den är.
    if (existing.doNotMonitor) {
      const link = await prisma.link.findFirst({
        where: { id },
        include: linkIncludeFor(req.user!.userId),
      });
      res.json(serializeLink(link!));
      return;
    }

    const settings = await getSettings();
    await runCheck(existing, settings.healthCheckTimeoutSec);

    const link = await prisma.link.findFirst({
      where: { id },
      include: linkIncludeFor(req.user!.userId),
    });
    res.json(serializeLink(link!));
  })
);

// ---- Bulk import (ADMIN) ----

const importLinkSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  categoryPath: z.array(z.string().min(1).max(100)).max(20).optional(),
  manageSoftware: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(2000).optional().nullable(),
  environment: z.nativeEnum(Environment).optional(),
  owningTeam: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(LinkStatus).optional(),
  tags: z.array(z.string().min(1).max(50)).max(50).optional(),
  doNotMonitor: z.boolean().optional(),
  extraMonitor: z.boolean().optional(),
  extraMonitorMinutes: z.number().int().min(1).max(1440).optional().nullable(),
});

const importSchema = z.object({
  links: z.array(importLinkSchema).max(5000),
});

// Find-or-create the system Inbox category (top level), migrating the legacy Swedish name.
async function resolveInboxCategory(): Promise<number> {
  let inbox = await prisma.category.findFirst({
    where: { name: { in: [INBOX_NAME, LEGACY_INBOX_NAME] }, parentId: null },
  });
  if (!inbox) {
    inbox = await prisma.category.create({ data: { name: INBOX_NAME, sortOrder: 999 } });
  } else if (inbox.name === LEGACY_INBOX_NAME) {
    inbox = await prisma.category.update({ where: { id: inbox.id }, data: { name: INBOX_NAME } });
  }
  return inbox.id;
}

// Find-or-create a category chain from a name path (root -> leaf); returns the leaf id.
// Empty path falls back to the Inbox. Relies on the @@unique([parentId, name]) constraint.
async function resolveCategoryPath(path: string[]): Promise<number> {
  let parentId: number | null = null;
  let leafId: number | null = null;
  for (const raw of path) {
    const name = raw.trim();
    if (!name) continue;
    let cat: { id: number } | null = await prisma.category.findFirst({
      where: { name, parentId },
      select: { id: true },
    });
    if (!cat) cat = await prisma.category.create({ data: { name, parentId }, select: { id: true } });
    parentId = cat.id;
    leafId = cat.id;
  }
  return leafId ?? resolveInboxCategory();
}

// POST /api/links/import – bulk import links from a JSON export (ADMIN). Non-destructive:
// adds new links, skips duplicates (same name + url among non-deleted links). Categories in
// each link's path are created on demand. Returns a per-row summary.
router.post(
  '/import',
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const data = importSchema.parse(req.body);
    let created = 0;
    let skipped = 0;
    const errors: { index: number; name: string; error: string }[] = [];

    for (let i = 0; i < data.links.length; i++) {
      const item = data.links[i];
      try {
        const dup = await prisma.link.findFirst({
          where: { name: item.name, url: item.url, isDeleted: false },
          select: { id: true },
        });
        if (dup) {
          skipped++;
          continue;
        }

        const categoryId = await resolveCategoryPath(item.categoryPath ?? []);
        const tagConnect = item.tags ? await resolveTags(item.tags) : [];

        await prisma.link.create({
          data: {
            name: item.name,
            url: item.url,
            categoryId,
            manageSoftware: item.manageSoftware ?? null,
            description: item.description ?? null,
            imageUrl: item.imageUrl ? item.imageUrl : null,
            environment: item.environment ?? Environment.NA,
            owningTeam: item.owningTeam ?? null,
            status: item.status ?? LinkStatus.ACTIVE,
            doNotMonitor: item.doNotMonitor ?? false,
            extraMonitor: item.extraMonitor ?? false,
            extraMonitorMinutes: item.extraMonitor ? item.extraMonitorMinutes ?? null : null,
            addedById: req.user!.userId,
            tags: { connect: tagConnect },
          },
        });
        created++;
      } catch (err) {
        errors.push({
          index: i,
          name: item.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await writeAudit({
      action: 'IMPORT_LINKS',
      entity: 'Link',
      entityId: 0,
      userId: req.user!.userId,
      newValue: { created, skipped, errorCount: errors.length },
    });

    res.json({ created, skipped, errors });
  })
);

export default router;
