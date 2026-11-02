// Authenticated, encrypted, short-lived case tokens (AES-256-GCM).
// Token = base64url(version byte | 12-byte IV | ciphertext | 16-byte tag).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError, ConfigError } from "../errors";

const TOKEN_VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;

interface Envelope<T> {
  exp: number; // unix seconds
  data: T;
}

export function decodeSealKey(b64: string): Buffer {
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new ConfigError("CASE_SEAL_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function seal<T>(data: T, key: Buffer, ttlSeconds: number, now = Date.now()): string {
  const env: Envelope<T> = { exp: Math.floor(now / 1000) + ttlSeconds, data };
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from([TOKEN_VERSION]));
  const ct = Buffer.concat([cipher.update(JSON.stringify(env), "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from([TOKEN_VERSION]), iv, ct, cipher.getAuthTag()]).toString("base64url");
}

export function unseal<T>(token: string, key: Buffer, now = Date.now()): T {
  const invalid = () => new AppError("CASE_INVALID", "This case could not be verified. Please start a new check.", 400);
  let raw: Buffer;
  try {
    raw = Buffer.from(token, "base64url");
  } catch {
    throw invalid();
  }
  if (raw.length < 1 + IV_LEN + TAG_LEN + 1 || raw[0] !== TOKEN_VERSION) throw invalid();
  const iv = raw.subarray(1, 1 + IV_LEN);
  const tag = raw.subarray(raw.length - TAG_LEN);
  const ct = raw.subarray(1 + IV_LEN, raw.length - TAG_LEN);
  let env: Envelope<T>;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from([TOKEN_VERSION]));
    decipher.setAuthTag(tag);
    env = JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8"));
  } catch {
    throw invalid();
  }
  if (typeof env.exp !== "number" || env.exp * 1000 <= now) {
    throw new AppError("CASE_EXPIRED", "This case has expired. Please start a new check.", 410);
  }
  return env.data;
}
