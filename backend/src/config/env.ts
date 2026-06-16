import "dotenv/config";
import { ConfigurationError } from "../errors/index.js";

export interface AppConfig {
  port: number;
  dbPath: string;
  /** CORS allow-list. `"*"` opens all origins. */
  allowedOrigins: string[];
  /** Max request body the JSON parser will accept (string accepted by Express). */
  bodyLimit: string;
  /** Same as `bodyLimit` expressed in bytes for user-facing error messages. */
  bodyLimitBytes: number;
  /** Per-IP cap on expensive LLM calls (per minute). */
  extractionRateLimitPerMin: number;
  openai: {
    apiKey: string;
    model: string;
    requestTimeoutMs: number;
  };
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEFAULT_BODY_LIMIT_MB = 2;

export const config: AppConfig = {
  port: readNumber(process.env.PORT, 8000),
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  allowedOrigins: readList(process.env.ALLOWED_ORIGINS, [
    "http://localhost:3000",
  ]),
  bodyLimit: `${DEFAULT_BODY_LIMIT_MB}mb`,
  bodyLimitBytes: DEFAULT_BODY_LIMIT_MB * 1024 * 1024,
  extractionRateLimitPerMin: readNumber(
    process.env.EXTRACTION_RATE_LIMIT_PER_MIN,
    10,
  ),
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    requestTimeoutMs: readNumber(process.env.OPENAI_TIMEOUT_MS, 45_000),
  },
};

export function assertOpenAiConfigured(c: AppConfig = config): void {
  if (!c.openai.apiKey) {
    throw new ConfigurationError(
      "OPENAI_API_KEY is not set. Add it to backend/.env (see backend/.env.example).",
    );
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
