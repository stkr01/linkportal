import { Request, Response, NextFunction } from 'express';
import { Role, roleRank } from '../constants';
import { verifyToken, JwtPayload } from '../auth/jwt';

// Utöka Express Request med användare
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const TOKEN_COOKIE = 'lp_token';

function extractToken(req: Request): string | undefined {
  // 1. HTTP-only cookie (webbapp)
  if (req.cookies && req.cookies[TOKEN_COOKIE]) {
    return req.cookies[TOKEN_COOKIE];
  }
  // 2. Authorization: Bearer (för t.ex. Chrome-tillägget i V2)
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.substring('Bearer '.length);
  }
  return undefined;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Ej inloggad.' });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Ogiltig eller utgången session.' });
  }
}

// Rollhierarki: ADMIN > EDITOR > VIEWER
export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Ej inloggad.' });
      return;
    }
    if (roleRank[req.user.role] < roleRank[minRole]) {
      res.status(403).json({ error: 'Otillräcklig behörighet.' });
      return;
    }
    next();
  };
}

export const TOKEN_COOKIE_NAME = TOKEN_COOKIE;
