// API Cache configuration helpers

// Cache durations in seconds
export const CACHE_DURATIONS = {
  // Short cache - 5 minutes (for frequently changing data)
  SHORT: 300,
  // Medium cache - 1 hour (for moderately stable data like card searches)
  MEDIUM: 3600,
  // Long cache - 24 hours (for very stable data like set listings)
  LONG: 86400,
};

// Get cache headers for API responses
export function getCacheHeaders(maxAge: number = CACHE_DURATIONS.MEDIUM) {
  return {
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
  };
}

// Get no-cache headers for dynamic/user-specific data
export function getNoCacheHeaders() {
  return {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}
