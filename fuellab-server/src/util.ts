import { randomUUID } from 'crypto';

/** Small indirection so route files don't each import crypto. */
export function newIdSafe(): string {
  return randomUUID();
}
