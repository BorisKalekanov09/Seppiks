/**
 * lib/env.ts
 *
 * Loads and validates every environment variable the server needs.
 * The process exits immediately if a required variable is missing,
 * so you always get a loud, early error instead of a silent bug
 * that appears only when a request hits a broken code path.
 */

import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[ENV] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  SUPABASE_URL:              requireEnv("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  REDIS_URL:                 optional("REDIS_URL", "redis://localhost:6379"),
  SENTRY_DSN:                optional("SENTRY_DSN", ""),
  PORT:                      parseInt(optional("PORT", "3000"), 10),
  HOST:                      optional("HOST", "0.0.0.0"),
  NODE_ENV:                  optional("NODE_ENV", "development"),
  ALLOWED_ORIGINS:           optional("ALLOWED_ORIGINS", "http://localhost:8081")
    .split(",")
    .map((o) => o.trim()),
} as const;
