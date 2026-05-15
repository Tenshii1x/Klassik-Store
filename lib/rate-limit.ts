// Simple in-memory rate limiter. Resets when serverless function cold-starts.
// For production-grade rate limit, swap with @vercel/kv or Upstash.

const buckets = new Map<string, { count: number; resetAt: number }>()

interface Options {
  windowMs: number
  max: number
}

export function rateLimit(key: string, opts: Options): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.max - 1 }
  }
  if (bucket.count >= opts.max) {
    return { allowed: false, remaining: 0 }
  }
  bucket.count++
  return { allowed: true, remaining: opts.max - bucket.count }
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key)
    }
  }, 60_000)
}
