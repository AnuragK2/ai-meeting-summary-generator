import { describe, expect, it } from "vitest";
import { ExtractionResultSchema } from "../src/validation/extraction.schema.js";

const validPayload = {
  summary: "We agreed on the Q4 roadmap and the launch date.",
  key_decisions: [
    {
      text: "Ship the beta on Nov 15",
      source_quote: "Let's commit to shipping the beta on Nov 15.",
    },
    { text: "Adopt the new design system", source_quote: null },
  ],
  open_questions: ["Who owns analytics rollout?"],
  action_items: [
    {
      owner: "Priya",
      task_description: "Draft launch email",
      due_date: "2025-11-10",
      priority: "high",
      source_quote: "Priya, can you draft the launch email by Monday?",
    },
    {
      owner: "Unassigned",
      task_description: "Schedule design review",
      due_date: null,
      priority: "medium",
      source_quote: null,
    },
  ],
};

describe("ExtractionResultSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = ExtractionResultSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects when summary is missing", () => {
    const { summary, ...rest } = validPayload;
    void summary;
    const result = ExtractionResultSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    const bad = {
      ...validPayload,
      action_items: [{ ...validPayload.action_items[0], priority: "urgent" }],
    };
    const result = ExtractionResultSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects non-array action_items", () => {
    const bad = { ...validPayload, action_items: "nope" };
    const result = ExtractionResultSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects wrong-type due_date", () => {
    const bad = {
      ...validPayload,
      action_items: [{ ...validPayload.action_items[0], due_date: 12345 }],
    };
    const result = ExtractionResultSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("accepts empty arrays for decisions, questions, and action_items", () => {
    const empty = {
      summary: "Short standup, nothing decided.",
      key_decisions: [],
      open_questions: [],
      action_items: [],
    };
    const result = ExtractionResultSchema.safeParse(empty);
    expect(result.success).toBe(true);
  });
});
