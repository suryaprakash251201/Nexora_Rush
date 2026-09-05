import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fields[key]) fields[key] = issue.message;
    }
    return res.status(400).json({
      error: 'Please check the highlighted fields.',
      code: 'VALIDATION',
      fields,
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.fields ? { fields: err.fields } : {}),
    });
  }
  // Log technical details server-side only; never leak stack traces to players.
  console.error('[server error]', err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'INTERNAL' });
}
