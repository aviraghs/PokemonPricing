/**
 * Rate Limiter with In-Memory Fallback
 *
 * For production: Replace with Redis or database-backed rate limiting
 * This implementation uses in-memory storage which works for single-instance deployments
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.limits = new Map();

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request is allowed under the rate limit
   * @param key Unique identifier for the rate limit (e.g., 'justtcg', 'ebay')
   * @param maxRequests Maximum requests allowed
   * @param windowMs Time window in milliseconds
   * @returns true if request is allowed, false if rate limited
   */
  async checkLimit(key: string, maxRequests: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No existing entry or window expired
    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    // Within window
    if (entry.count < maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Manually set rate limit (e.g., when API returns 429)
   */
  setRateLimited(key: string, resetAt: number): void {
    this.limits.set(key, {
      count: Infinity, // Block all requests
      resetAt,
    });
  }

  /**
   * Check if currently rate limited
   */
  isRateLimited(key: string): boolean {
    const entry = this.limits.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now >= entry.resetAt) {
      this.limits.delete(key);
      return false;
    }

    return entry.count === Infinity;
  }

  /**
   * Get time until rate limit resets
   */
  getResetTime(key: string): number | null {
    const entry = this.limits.get(key);
    if (!entry) return null;

    const now = Date.now();
    return Math.max(0, entry.resetAt - now);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// API-specific rate limiters with backoff
export async function checkJustTCGLimit(): Promise<{ allowed: boolean; resetIn?: number }> {
  // JustTCG: 100 requests per hour (conservative estimate)
  const result = await rateLimiter.checkLimit('justtcg', 100, 60 * 60 * 1000);

  return {
    allowed: result.allowed,
    resetIn: result.allowed ? undefined : result.resetAt - Date.now(),
  };
}

export async function checkEbayLimit(): Promise<{ allowed: boolean; resetIn?: number }> {
  // eBay via RapidAPI: typically 100-500 requests/month depending on plan
  // Using conservative 10 requests per minute
  const result = await rateLimiter.checkLimit('ebay', 10, 60 * 1000);

  return {
    allowed: result.allowed,
    resetIn: result.allowed ? undefined : result.resetAt - Date.now(),
  };
}

export async function checkPokemonPriceTrackerLimit(): Promise<{ allowed: boolean; resetIn?: number }> {
  // Pokemon Price Tracker: Unknown limits, use conservative 20/min
  const result = await rateLimiter.checkLimit('pokemonpricetracker', 20, 60 * 1000);

  return {
    allowed: result.allowed,
    resetIn: result.allowed ? undefined : result.resetAt - Date.now(),
  };
}

/**
 * Handle 429 response from API
 */
export function handleRateLimitResponse(apiName: string, retryAfter?: string | number): void {
  let resetAt: number;

  if (retryAfter) {
    // retryAfter can be seconds or a date
    if (typeof retryAfter === 'string' && isNaN(Number(retryAfter))) {
      resetAt = new Date(retryAfter).getTime();
    } else {
      resetAt = Date.now() + Number(retryAfter) * 1000;
    }
  } else {
    // Default: 1 hour
    resetAt = Date.now() + 60 * 60 * 1000;
  }

  rateLimiter.setRateLimited(apiName, resetAt);
  console.log(`⚠️ ${apiName} rate limited until ${new Date(resetAt).toISOString()}`);
}
