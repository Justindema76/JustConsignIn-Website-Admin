const buckets = globalThis.__justconsigninRateBuckets || new Map();
globalThis.__justconsigninRateBuckets = buckets;

export function rateLimit(req, res, { key = 'default', limit = 12, windowMs = 60_000 } = {}) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const id = `${key}:${ip}`;
  const now = Date.now();
  const current = buckets.get(id);
  const next = !current || now >= current.resetAt ? { count: 1, resetAt: now + windowMs } : { ...current, count: current.count + 1 };
  buckets.set(id, next);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - next.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(next.resetAt / 1000)));
  if (next.count > limit) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((next.resetAt - now) / 1000))));
    res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    return false;
  }
  return true;
}
