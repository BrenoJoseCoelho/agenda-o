import { prisma } from "@/lib/prisma";

// Brute-force protection, backed by Postgres so it works across serverless
// instances (in-memory would reset on every cold start on Vercel).
//
// We throttle two keys per attempt: the email (protects a targeted account) and
// the IP (stops password spraying across many accounts from one source). Fixed
// window: after MAX failures within WINDOW, the key is locked for LOCK.

const WINDOW_MS = 15 * 60 * 1000; // janela de contagem
const LOCK_MS = 15 * 60 * 1000; // tempo de bloqueio ao estourar
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export type AttemptKey = { key: string; max: number };

export function loginKeys(email: string, ip: string): AttemptKey[] {
  return [
    { key: `email:${email.toLowerCase().trim()}`, max: MAX_PER_EMAIL },
    { key: `ip:${ip}`, max: MAX_PER_IP },
  ];
}

// Returns seconds to wait if any key is currently locked, otherwise null.
export async function loginRetryAfter(keys: AttemptKey[]): Promise<number | null> {
  const now = Date.now();
  let retry = 0;
  const rows = await prisma.loginAttempt.findMany({
    where: { key: { in: keys.map((k) => k.key) } },
  });
  for (const row of rows) {
    if (row.lockedUntil && row.lockedUntil.getTime() > now) {
      retry = Math.max(retry, Math.ceil((row.lockedUntil.getTime() - now) / 1000));
    }
  }
  return retry > 0 ? retry : null;
}

// Call after a failed login. Increments each key; locks it once it hits its max.
export async function recordLoginFailure(keys: AttemptKey[]): Promise<void> {
  const now = new Date();
  for (const { key, max } of keys) {
    const row = await prisma.loginAttempt.findUnique({ where: { key } });
    if (!row || now.getTime() - row.firstAt.getTime() > WINDOW_MS) {
      // Nova janela.
      await prisma.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAt: now, lockedUntil: null },
        update: { count: 1, firstAt: now, lockedUntil: null },
      });
    } else {
      const count = row.count + 1;
      const lockedUntil = count >= max ? new Date(now.getTime() + LOCK_MS) : row.lockedUntil;
      await prisma.loginAttempt.update({ where: { key }, data: { count, lockedUntil } });
    }
  }
}

// Call after a successful login to wipe the counters for that user/IP.
export async function clearLoginAttempts(keys: AttemptKey[]): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: { in: keys.map((k) => k.key) } } });
}
