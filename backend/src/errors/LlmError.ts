/**
 * Stable error codes the frontend can map to UI affordances. We deliberately
 * keep the set small — every code corresponds to a distinct user response
 * (retry, reduce input, fix config).
 */
export type LlmErrorCode =
  | "LLM_AUTH"
  | "LLM_RATE_LIMIT"
  | "LLM_TIMEOUT"
  | "LLM_CONTEXT_LENGTH"
  | "LLM_INVALID_OUTPUT"
  | "LLM_BAD_REQUEST"
  | "LLM_PROVIDER_ERROR"
  | "LLM_NETWORK";

/**
 * Thrown by any `MeetingExtractor` implementation when the underlying
 * provider call fails or returns output that does not match the schema.
 *
 * The orchestrating `ExtractionService` persists `.message` on the
 * meeting's `extraction_error` column so the UI can show it inline and
 * offer a Regenerate retry. `code` lets the frontend toast the right
 * affordance (e.g. "Add an API key" vs "Wait a moment and retry").
 */
export class LlmError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LlmError";
  }
}
