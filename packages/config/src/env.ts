// Centralized, validated application configuration.
// Nothing else in the codebase should read process.env directly — import `config` from here.
// See docs/operations/configuration.md for rationale.

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().min(1),

  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  SENTRY_DSN: z.string().url().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

// Pure function, no side effects — this is what tests import (packages/config has no test
// of its own yet that calls this directly, but apps/api and the test suite both can without
// triggering process.exit). Kept separate from `config` below so validation logic is
// testable in isolation from "what happens when validation fails at boot".
export function parseEnv(raw: NodeJS.ProcessEnv): ReturnType<typeof envSchema.safeParse> {
  return envSchema.safeParse(raw);
}

function loadConfig(): AppConfig {
  const parsed = parseEnv(process.env);

  if (!parsed.success) {
    // Fail fast and loud at boot — never at request time.
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:");
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const config: AppConfig = loadConfig();
