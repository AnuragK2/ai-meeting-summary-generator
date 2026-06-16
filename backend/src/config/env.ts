import "dotenv/config";
import { ConfigurationError } from "../errors/index.js";

export interface AppConfig {
  port: number;
  dbPath: string;
  openai: {
    apiKey: string;
    model: string;
  };
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config: AppConfig = {
  port: readNumber(process.env.PORT, 8000),
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
};

export function assertOpenAiConfigured(c: AppConfig = config): void {
  if (!c.openai.apiKey) {
    throw new ConfigurationError(
      "OPENAI_API_KEY is not set. Add it to backend/.env (see backend/.env.example).",
    );
  }
}
