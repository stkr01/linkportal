import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';
import { Role } from '../constants';
import { signToken } from '../auth/jwt';
import { asyncHandler } from '../middleware/error';
import { authenticate, TOKEN_COOKIE_NAME } from '../middleware/auth';
import { isProd } from '../config';

const router = Router();

// Rate limiting på login – skydd mot brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'För många inloggningsförsök. Försök igen senare.' },
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Lösenordet måste vara minst 8 tecken.'),
});

// Färgtema: en uppsättning hex-färger (alla valfria). null/tomt = standardtema.
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const themeSchema = z
  .object({
    primary: z.string().regex(HEX),
    primaryDark: z.string().regex(HEX),
    accent: z.string().regex(HEX),
    bg: z.string().regex(HEX),
    surface: z.string().regex(HEX),
    text: z.string().regex(HEX),
  })
  .partial();

function safeParseTheme(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000, // 8h
};

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });
    // Generiskt felmeddelande – avslöja inte om användarnamnet finns.
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role as Role });
    res.cookie(TOKEN_COOKIE_NAME, token, cookieOptions);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        theme: user.theme ? safeParseTheme(user.theme) : null,
      },
      // token returneras också så t.ex. Chrome-tillägget (V2) kan använda Bearer.
      token,
    });
  })
);

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie(TOKEN_COOKIE_NAME);
  res.json({ ok: true });
});

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Ej inloggad.' });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      theme: user.theme ? safeParseTheme(user.theme) : null,
    });
  })
);

router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: 'Ej inloggad.' });
      return;
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      res.status(400).json({ error: 'Nuvarande lösenord stämmer inte.' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    res.json({ ok: true });
  })
);

// PUT /api/auth/theme – spara inloggad användares färgtema (alla roller)
router.put(
  '/theme',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // body { theme: {...} | null } – null återställer till standard
    const body = z.object({ theme: themeSchema.nullable() }).parse(req.body);
    const theme = body.theme && Object.keys(body.theme).length > 0 ? JSON.stringify(body.theme) : null;

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { theme },
    });
    res.json({ theme: theme ? JSON.parse(theme) : null });
  })
);

export default router;
