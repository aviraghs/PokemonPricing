/**
 * Environment Variable Validator
 *
 * This module validates that all required environment variables are set
 * and throws helpful errors if any are missing.
 *
 * Import this at the top of your app to catch configuration issues early.
 */

interface EnvConfig {
  // Database
  MONGO_URI: string;

  // Authentication
  JWT_SECRET: string;

  // API Keys (optional but recommended)
  RAPIDAPI_KEY?: string;
  POKEMONPRICETRACKER_API_KEY?: string;
  JUSTTCG_API_KEY?: string;
  POKEFETCH_API_KEY?: string;

  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_BASE_URL?: string;
}

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'NODE_ENV',
] as const;

const optionalEnvVars = [
  'RAPIDAPI_KEY',
  'POKEMONPRICETRACKER_API_KEY',
  'JUSTTCG_API_KEY',
  'POKEFETCH_API_KEY',
  'NEXT_PUBLIC_BASE_URL',
] as const;

/**
 * Validates required environment variables
 * @throws Error if required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional but recommended variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing
        .map((v) => `  - ${v}`)
        .join('\n')}\n\nPlease check your .env.local file.`
    );
  }

  // Log warnings for optional variables (only in development)
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `⚠️  Optional environment variables not set:\n${warnings
        .map((v) => `  - ${v}`)
        .join('\n')}\n\nSome features may not work correctly.`
    );
  }

  // Validate JWT_SECRET strength (at least 32 characters)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(
      '⚠️  JWT_SECRET is too short (< 32 characters). Generate a stronger secret using:\n' +
      '   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  // Validate NEXT_PUBLIC_BASE_URL format
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL);
    } catch {
      console.warn(
        `⚠️  NEXT_PUBLIC_BASE_URL is not a valid URL: ${process.env.NEXT_PUBLIC_BASE_URL}`
      );
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
  }
}

/**
 * Gets a typed environment configuration
 * Only call this after validateEnv() has been called
 */
export function getEnv(): EnvConfig {
  return {
    MONGO_URI: process.env.MONGO_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    POKEMONPRICETRACKER_API_KEY: process.env.POKEMONPRICETRACKER_API_KEY,
    JUSTTCG_API_KEY: process.env.JUSTTCG_API_KEY,
    POKEFETCH_API_KEY: process.env.POKEFETCH_API_KEY,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  };
}
