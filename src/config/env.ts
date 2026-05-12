import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/curatedcounter"),
  DIRECT_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default("development-access-secret-change-me-please"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default("development-refresh-secret-change-me-please"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  COOKIE_DOMAIN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5-nano"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  ADMIN_EMAIL: z.string().email().default("admin@curatedcounter.com"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
