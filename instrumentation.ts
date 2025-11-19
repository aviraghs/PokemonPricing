/**
 * Next.js Instrumentation File
 *
 * This file runs once when the Next.js server starts.
 * Use it for setup tasks like environment validation, monitoring, etc.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env-validator');

    try {
      validateEnv();
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      // In production, we might want to exit the process
      if (process.env.NODE_ENV === 'production') {
        console.error('Exiting due to missing environment variables in production');
        process.exit(1);
      }
    }
  }
}
