// In-memory rate limiter
// Max 3 preview requests per IP per day
// Bypassed when a valid paid token is provided
// Note: works within a single Vercel function instance.
// For multi-instance production, replace with Redis (e.g. Upstash).

const LIMIT = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Global store: { ip: { count, resetAt } }
const store = global._rateLimitStore || (global._rateLimitStore = {});

export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function checkRateLimit(ip, paidToken) {
  // If a paid token is present, skip rate limit entirely
  if (paidToken && paidToken.startsWith('paid_')) {
    return { allowed: true, remaining: 999, paid: true };
  }

  const now = Date.now();
  const entry = store[ip];

  if (!entry || now > entry.resetAt) {
    store[ip] = { count: 1, resetAt: now + WINDOW_MS };
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (entry.count >= LIMIT) {
    const retryAfterMs = entry.resetAt - now;
    const retryAfterHours = Math.ceil(retryAfterMs / (1000 * 60 * 60));
    return { allowed: false, remaining: 0, retryAfterHours };
  }

  entry.count++;
  return { allowed: true, remaining: LIMIT - entry.count };
}
