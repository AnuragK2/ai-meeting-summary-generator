import type { ExtractionResult } from "../validation/extraction.schema.js";

/**
 * Strategy boundary for turning a transcript into structured meeting notes.
 *
 * Currently implemented by `infrastructure/openai/OpenAiExtractor`. A future
 * mock / heuristic / local-model implementation would live alongside it and
 * be selected in the composition root (`app.ts`).
 */
export interface MeetingExtractor {
  extract(transcript: string): Promise<ExtractionResult>;
}
