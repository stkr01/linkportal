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

export default router;
