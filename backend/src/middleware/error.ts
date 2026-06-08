import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Central felhanterare – fångar Zod-valideringsfel och okända fel.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Valideringsfel', details: err.flatten() });
    return;
  }

  // Prisma unique constraint
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'Posten finns redan (dubblett).' });
      return;
    }
    if (code === 'P2025') {
      res.status(404).json({ error: 'Posten hittades inte.' });
      return;
    }
  }

  console.error('Oväntat fel:', err);
  res.status(500).json({ error: 'Internt serverfel.' });
}

// Wrapper så async-routes kan kasta fel som fångas ovan.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
