import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Central felhanterare – fångar Zod-valideringsfel och okända fel.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten() });
    return;
  }

  // Prisma unique constraint
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'The record already exists (duplicate).' });
      return;
    }
    if (code === 'P2025') {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error.' });
}

// Wrapper så async-routes kan kasta fel som fångas ovan.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
