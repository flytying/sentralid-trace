import "server-only";
import { z } from "zod";
import { ConfigError } from "./errors";

export { ConfigError };

// Runtime AI must be a Meta model on the Meta endpoint. Anything else fails closed.
export const ALLOWED_META_HOSTS = ["api.meta.ai"] as const;
export const ALLOWED_MODEL_IDS = ["muse-spark-1.3"] as const;

const schema = z.object({
  META_BASE_URL: z.string().url().default("https://api.meta.ai/v1"),
  MODEL_ID: z.enum(ALLOWED_MODEL_IDS).default("muse-spark-1.3"),
  MODEL_API_KEY: z.string().min(1, "MODEL_API_KEY is not set"),
  MODEL_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
  CASE_SEAL_KEY: z.string().min(1, "CASE_SEAL_KEY is not set"),
  CASE_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
});

export type ServerEnv = z.infer<typeof schema>;


export function parseEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", ");
    throw new ConfigError(`Invalid server configuration: ${fields}`);
  }
  const env = parsed.data;
  const url = new URL(env.META_BASE_URL);
  if (url.protocol !== "https:" || !(ALLOWED_META_HOSTS as readonly string[]).includes(url.hostname)) {
    throw new ConfigError("META_BASE_URL must be an https Meta Model API endpoint");
  }
  return { ...env, META_BASE_URL: url.origin + url.pathname.replace(/\/+$/, "") };
}

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
