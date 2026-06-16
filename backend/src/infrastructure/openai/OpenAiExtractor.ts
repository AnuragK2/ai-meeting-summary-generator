import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import { LlmError } from "../../errors/index.js";
import {
  ExtractionResultSchema,
  type ExtractionResult,
} from "../../validation/extraction.schema.js";
import { buildExtractionJsonSchema } from "./jsonSchema.js";
import {
  EXTRACTION_SYSTEM_PROMPT,
  RETRY_NUDGE,
  buildUserMessage,
} from "./prompt.js";
import type { MeetingExtractor } from "../../services/MeetingExtractor.js";

export interface OpenAiExtractorOptions {
  apiKey: string;
  model: string;
  /** Override OpenAI client construction (used in tests). */
  client?: OpenAI;
  /** Max number of follow-up attempts on JSON/schema failures. Defaults to 1. */
  maxRetries?: number;
  /** Hard timeout per OpenAI call in ms. Defaults to 45s. */
  requestTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * Concrete `MeetingExtractor` backed by OpenAI's strict structured-output
 * mode. The schema sent to OpenAI is derived from the same Zod definition
 * used to validate the response.
 *
 * Every failure path produces a typed `LlmError` with a stable `code` and
 * a message that is safe to surface verbatim to the end user.
 */
export class OpenAiExtractor implements MeetingExtractor {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly requestTimeoutMs: number;
  private readonly jsonSchema: Record<string, unknown>;

  constructor(opts: OpenAiExtractorOptions) {
    this.client =
      opts.client ??
      new OpenAI({ apiKey: opts.apiKey, timeout: opts.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS });
    this.model = opts.model;
    this.maxRetries = opts.maxRetries ?? 1;
    this.requestTimeoutMs = opts.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.jsonSchema = buildExtractionJsonSchema();
  }

  async extract(transcript: string): Promise<ExtractionResult> {
    const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(transcript) },
    ];

    let attemptMessages = baseMessages;
    let lastError: LlmError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.callOnce(attemptMessages);
      } catch (err) {
        const mapped = this.mapError(err);

        // Only schema/parse failures are worth a corrective retry; auth,
        // rate-limit, context-length, etc. will not be fixed by retrying.
        const retryable =
          mapped.code === "LLM_INVALID_OUTPUT" && attempt < this.maxRetries;
        if (!retryable) throw mapped;

        lastError = mapped;
        attemptMessages = [
          ...baseMessages,
          { role: "user", content: RETRY_NUDGE },
        ];
      }
    }

    throw lastError ?? new LlmError("LLM_PROVIDER_ERROR", "OpenAI extraction failed");
  }

  private async callOnce(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<ExtractionResult> {
    const resp = await this.client.chat.completions.create(
      {
        model: this.model,
        messages,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ExtractionResult",
            strict: true,
            schema: this.jsonSchema,
          },
        },
      },
      { timeout: this.requestTimeoutMs },
    );

    const raw = resp.choices[0]?.message?.content;
    if (!raw) {
      throw new LlmError(
        "LLM_INVALID_OUTPUT",
        "The AI provider returned an empty response. Try again.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new LlmError(
        "LLM_INVALID_OUTPUT",
        "The AI provider returned malformed JSON. Try regenerating.",
        err,
      );
    }

    const result = ExtractionResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new LlmError(
        "LLM_INVALID_OUTPUT",
        "The AI provider returned data that did not match the expected schema.",
        result.error.flatten(),
      );
    }
    return result.data;
  }

  /**
   * Translate any error coming out of the OpenAI SDK into a `LlmError` with
   * a stable code and a message we are happy to show end-users.
   */
  private mapError(err: unknown): LlmError {
    if (err instanceof LlmError) return err;

    if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
      return new LlmError(
        "LLM_AUTH",
        "Your OpenAI API key was rejected. Check OPENAI_API_KEY in backend/.env.",
        err,
      );
    }
    if (err instanceof RateLimitError) {
      return new LlmError(
        "LLM_RATE_LIMIT",
        "OpenAI is rate-limiting requests. Wait a moment and try again.",
        err,
      );
    }
    if (err instanceof APIConnectionTimeoutError) {
      return new LlmError(
        "LLM_TIMEOUT",
        "The AI provider took too long to respond. Try again.",
        err,
      );
    }
    if (err instanceof APIConnectionError) {
      return new LlmError(
        "LLM_NETWORK",
        "Could not reach the AI provider. Check the server's internet connection.",
        err,
      );
    }
    if (err instanceof BadRequestError) {
      const message = String((err as { message?: string }).message ?? "");
      if (/context|too long|maximum/i.test(message)) {
        return new LlmError(
          "LLM_CONTEXT_LENGTH",
          "The transcript is too long for this model. Try shortening it or splitting into smaller meetings.",
          err,
        );
      }
      return new LlmError(
        "LLM_BAD_REQUEST",
        "The AI provider rejected the request: " + message,
        err,
      );
    }
    if (err instanceof APIError) {
      return new LlmError(
        "LLM_PROVIDER_ERROR",
        `The AI provider returned an error (${err.status ?? "unknown"}). Try again.`,
        err,
      );
    }
    if (err instanceof Error) {
      return new LlmError("LLM_PROVIDER_ERROR", err.message, err);
    }
    return new LlmError("LLM_PROVIDER_ERROR", "Unknown AI provider error", err);
  }
}
