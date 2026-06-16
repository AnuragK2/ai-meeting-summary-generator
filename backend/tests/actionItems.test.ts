import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createDatabase } from "../src/infrastructure/database/connection.js";
import type { MeetingExtractor } from "../src/services/MeetingExtractor.js";
import type { ExtractionResult } from "../src/validation/extraction.schema.js";

const fakeExtraction: ExtractionResult = {
  summary: "Test summary describing the meeting.",
  key_decisions: [{ text: "Decision A", source_quote: null }],
  open_questions: ["Question A?"],
  action_items: [
    {
      owner: "Alice",
      task_description: "Send the report",
      due_date: "2025-12-01",
      priority: "high",
      source_quote: "Alice, send the report by Dec 1.",
    },
    {
      owner: "Bob",
      task_description: "Book the room",
      due_date: null,
      priority: "low",
      source_quote: null,
    },
  ],
};

const stubExtractor: MeetingExtractor = {
  extract: async () => fakeExtraction,
};

function buildTestApp() {
  const db = createDatabase(":memory:");
  return createApp({ db, extractor: stubExtractor, disableRateLimit: true });
}

describe("PATCH /api/action-items/:id", () => {
  let app: ReturnType<typeof buildTestApp>;
  let actionItemId: string;
  let meetingId: string;

  beforeEach(async () => {
    app = buildTestApp();
    const create = await request(app)
      .post("/api/meetings")
      .send({
        title: "Sprint planning",
        date: "2025-11-01",
        participants: ["Alice", "Bob"],
        raw_transcript:
          "This transcript is intentionally long enough to pass the minimum length validator. Alice will send the report. Bob will book the room.",
      });
    expect(create.status).toBe(201);
    expect(create.body.extraction_ok).toBe(true);
    expect(create.body.action_items).toHaveLength(2);
    meetingId = create.body.meeting.id;
    actionItemId = create.body.action_items[0].id;
  });

  it("transitions open -> in_progress -> done and updates updated_at", async () => {
    const first = await request(app)
      .patch(`/api/action-items/${actionItemId}`)
      .send({ status: "in_progress" });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("in_progress");

    await new Promise((r) => setTimeout(r, 5));

    const second = await request(app)
      .patch(`/api/action-items/${actionItemId}`)
      .send({ status: "done" });
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("done");
    expect(new Date(second.body.updated_at).getTime()).toBeGreaterThan(
      new Date(first.body.updated_at).getTime(),
    );
  });

  it("updates owner, priority, and due_date together", async () => {
    const res = await request(app)
      .patch(`/api/action-items/${actionItemId}`)
      .send({ owner: "Carol", priority: "medium", due_date: "2026-01-15" });
    expect(res.status).toBe(200);
    expect(res.body.owner).toBe("Carol");
    expect(res.body.priority).toBe("medium");
    expect(res.body.due_date).toBe("2026-01-15");
  });

  it("returns 400 for invalid status", async () => {
    const res = await request(app)
      .patch(`/api/action-items/${actionItemId}`)
      .send({ status: "shipped" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when no fields are provided", async () => {
    const res = await request(app)
      .patch(`/api/action-items/${actionItemId}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch(`/api/action-items/does-not-exist`)
      .send({ status: "done" });
    expect(res.status).toBe(404);
  });

  it("supports clearing due_date via null", async () => {
    const res = await request(app)
      .patch(`/api/action-items/${actionItemId}`)
      .send({ due_date: null });
    expect(res.status).toBe(200);
    expect(res.body.due_date).toBeNull();
  });

  it("includes the action item in cross-meeting filter results", async () => {
    const list = await request(app)
      .get("/api/action-items")
      .query({ owner: "alice" });
    expect(list.status).toBe(200);
    expect(list.body.action_items).toHaveLength(1);
    expect(list.body.action_items[0].meeting_title).toBe("Sprint planning");
    expect(list.body.action_items[0].meeting_id).toBe(meetingId);
  });
});
