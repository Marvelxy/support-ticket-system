import type { NextFunction, Request, Response } from 'express';

// Wrap async route handlers so rejections reach the error middleware in app.ts
export const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
