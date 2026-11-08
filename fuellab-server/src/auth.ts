import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, getStoredJwtSecret, getUserById, type DbUser } from './db';

/**
 * Token-signing secret: JWT_SECRET if set, otherwise the random one the server created and
 * keeps in the database (see loadJwtSecret in db.ts). Every API request opens the database
 * first, so the stored secret is always there by the time a token is signed or checked.
 */
export function getJwtSecret(): string {
  const secret = env('JWT_SECRET') || getStoredJwtSecret();
  if (!secret) throw new Error('Signing secret not loaded: the database is not open yet');
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '30d' });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  let userId: string;
  try {
    userId = (jwt.verify(match[1], getJwtSecret(), { algorithms: ['HS256'] }) as { sub: string }).sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  // A database error falls through to the error handler (500), so a brief outage
  // doesn't look like a bad token and sign people out.
  const user: DbUser | undefined = await getUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  req.currentUser = user;
  next();
}
