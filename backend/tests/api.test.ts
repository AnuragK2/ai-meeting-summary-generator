import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createDatabase } from "../src/infrastructure/database/connection.js";
import { LlmError } from "../src/errors/index.js";
import type { MeetingExtractor } from "../src/services/MeetingExtractor.js";
import type { ExtractionResult } from "../src/validation/extraction.schema.js";

function makeExtraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    summary: "We discussed the launch.",
    key_decisions: [{ text: "Ship next week", source_quote: null }],
    open_questions: ["Who owns analytics?"],
    action_items: [
      {
        owner: "Alice",
        task_description: "Send the report",
        due_date: "2099-12-01",
        priority: "high",
        source_quote: null,
      },
    ],
    ...overrides,
  };
}

class StubExtractor implements MeetingExtractor {
  public calls = 0;
  constructor(
    private readonly handler: (n: number) => Promise<ExtractionResult>,
  ) {}
  extract(): Promise<ExtractionResult> {
    this.calls += 1;
    return this.handler(this.calls);
  }
}

const TRANSCRIPT = "x".repeat(80) + " — synthetic transcript long enough.";

function buildApp(extractor: MeetingExtractor) {
  const db = createDatabase(":memory:");
  return createApp({ db, extractor, disableRateLimit: true });
}

describe("POST /api/meetings — extraction failure path", () => {
  it("persists the meeting, marks it failed, returns extraction_ok=false", async () => {
    const extractor = new StubExtractor(async () => {
      throw new LlmError("LLM_AUTH", "Your OpenAI API key was rejected.");
    });
    const app = buildApp(extractor);

    const res = await request(app)
      .post("/api/meetings")
      .send({
        title: "Doomed standup",
        date: "2025-11-01",
        participants: [],
        raw_transcript: TRANSCRIPT,
      });

    expect(res.status).toBe(201);
    expect(res.body.extraction_ok).toBe(false);
    expect(res.body.meeting.extraction_status).toBe("failed");
    expect(res.body.meeting.extraction_error).toContain("OpenAI API key");
    expect(res.body.summary).toBeNull();
    expect(res.body.action_items).toEqual([]);
  });

  it("returns extraction_ok=true when the extractor succeeds", async () => {
    const extractor = new StubExtractor(async () => makeExtraction());
    const app = buildApp(extractor);

    const res = await request(app)
      .post("/api/meetings")
      .send({
        title: "Happy standup",
        date: "2025-11-01",
        participants: ["Alice"],
        raw_transcript: TRANSCRIPT,
      });

    expect(res.status).toBe(201);
    expect(res.body.extraction_ok).toBe(true);
    expect(res.body.meeting.extraction_status).toBe("completed");
    expect(res.body.action_items).toHaveLength(1);
  });
});

describe("POST /api/meetings/:id/regenerate — replaces summary + items", () => {
  it("does not duplicate items across successive regenerations", async () => {
    const extractor = new StubExtractor(async (n) =>
      makeExtraction({
        summary: `Summary attempt #${n}`,
        action_items: [
          {
            owner: `Owner${n}`,
            task_description: `Task #${n}`,
            due_date: null,
            priority: "medium",
            source_quote: null,
          },
        ],
      }),
    );
    const app = buildApp(extractor);

    const create = await request(app)
      .post("/api/meetings")
      .send({
        title: "Regen target",
        date: "2025-11-01",
        participants: [],
        raw_transcript: TRANSCRIPT,
      });
    expect(create.status).toBe(201);
    expect(create.body.action_items).toHaveLength(1);
    const meetingId = create.body.meeting.id;

    const regen1 = await request(app).post(`/api/meetings/${meetingId}/regenerate`);
    expect(regen1.status).toBe(200);
    expect(regen1.body.action_items).toHaveLength(1);
    expect(regen1.body.action_items[0].owner).toBe("Owner2");
    expect(regen1.body.summary.summary).toBe("Summary attempt #2");

    const regen2 = await request(app).post(`/api/meetings/${meetingId}/regenerate`);
    expect(regen2.status).toBe(200);
    expect(regen2.body.action_items).toHaveLength(1);
    expect(regen2.body.action_items[0].owner).toBe("Owner3");
  });

  it("on regen failure, flips status to failed but keeps previous data intact", async () => {
    let attempt = 0;
    const extractor: MeetingExtractor = {
      extract: async () => {
        attempt += 1;
        if (attempt === 1) return makeExtraction();
        throw new LlmError("LLM_PROVIDER_ERROR", "Provider exploded");
      },
    };
    const app = buildApp(extractor);

    const create = await request(app)
      .post("/api/meetings")
      .send({
        title: "Will fail on regen",
        date: "2025-11-01",
        participants: [],
        raw_transcript: TRANSCRIPT,
      });
    const id = create.body.meeting.id;

    const regen = await request(app).post(`/api/meetings/${id}/regenerate`);
    expect(regen.status).toBe(200);
    expect(regen.body.extraction_ok).toBe(false);
    expect(regen.body.meeting.extraction_status).toBe("failed");
    expect(regen.body.meeting.extraction_error).toContain("Provider exploded");
    // Previous summary + items are not removed on failure (only on success).
    expect(regen.body.summary).not.toBeNull();
    expect(regen.body.action_items).toHaveLength(1);
  });
});

describe("GET /api/action-items — cross-meeting filters", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    // Two meetings, one item each, distinct owners + due dates so each
    // filter has a discriminating answer.
    const extractor = new StubExtractor(async (n) =>
      makeExtraction({
        summary: `S${n}`,
        action_items: [
          {
            owner: n === 1 ? "Alice Anderson" : "Bob",
            task_description: `Task ${n}`,
            due_date: n === 1 ? "2000-01-01" : "2099-12-31",
            priority: n === 1 ? "high" : "low",
            source_quote: null,
          },
        ],
      }),
    );
    app = buildApp(extractor);

    for (const title of ["Meeting one", "Meeting two"]) {
      const res = await request(app)
        .post("/api/meetings")
        .send({
          title,
          date: "2025-11-01",
          participants: [],
          raw_transcript: TRANSCRIPT,
        });
      expect(res.status).toBe(201);
    }
  });

  it("filters by owner (case-insensitive substring)", async () => {
    const res = await request(app).get("/api/action-items").query({ owner: "anderson" });
    expect(res.status).toBe(200);
    expect(res.body.action_items).toHaveLength(1);
    expect(res.body.action_items[0].owner).toBe("Alice Anderson");
  });

  it("filters by overdue=true (past due_date and status != done)", async () => {
    const res = await request(app).get("/api/action-items").query({ overdue: "true" });
    expect(res.status).toBe(200);
    expect(res.body.action_items).toHaveLength(1);
    expect(res.body.action_items[0].owner).toBe("Alice Anderson");
  });

  it("filters by due_before (strictly less than)", async () => {
    const res = await request(app)
      .get("/api/action-items")
      .query({ due_before: "2050-01-01" });
    expect(res.status).toBe(200);
    expect(res.body.action_items).toHaveLength(1);
    expect(res.body.action_items[0].owner).toBe("Alice Anderson");
  });

  it("filters by priority", async () => {
    const res = await request(app).get("/api/action-items").query({ priority: "low" });
    expect(res.status).toBe(200);
    expect(res.body.action_items).toHaveLength(1);
    expect(res.body.action_items[0].owner).toBe("Bob");
  });

  it("includes meeting_title and meeting_id in the row", async () => {
    const res = await request(app).get("/api/action-items");
    expect(res.status).toBe(200);
    expect(res.body.action_items).toHaveLength(2);
    for (const row of res.body.action_items) {
      expect(typeof row.meeting_title).toBe("string");
      expect(typeof row.meeting_id).toBe("string");
    }
  });
});

describe("error middleware — body parser cases", () => {
  it("returns INVALID_JSON for malformed JSON", async () => {
    const extractor = new StubExtractor(async () => makeExtraction());
    const app = buildApp(extractor);

    const res = await request(app)
      .post("/api/meetings")
      .set("Content-Type", "application/json")
      .send("{this is not json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("returns PAYLOAD_TOO_LARGE for over-limit bodies", async () => {
    const extractor = new StubExtractor(async () => makeExtraction());
    const app = buildApp(extractor);
    // 3 MB body — exceeds the default 2 MB limit.
    const huge = "a".repeat(3 * 1024 * 1024);

    const res = await request(app)
      .post("/api/meetings")
      .send({
        title: "Too big",
        date: "2025-11-01",
        participants: [],
        raw_transcript: huge,
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(res.body.error.message).toMatch(/2 MB limit/);
  });

  it("returns NOT_FOUND for unknown /api routes", async () => {
    const extractor = new StubExtractor(async () => makeExtraction());
    const app = buildApp(extractor);
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/meetings/:id/export.md — Bonus A", () => {
  it("returns markdown with content-type and disposition", async () => {
    const extractor = new StubExtractor(async () => makeExtraction());
    const app = buildApp(extractor);

    const create = await request(app)
      .post("/api/meetings")
      .send({
        title: "Export me",
        date: "2025-11-01",
        participants: ["Zara"],
        raw_transcript: TRANSCRIPT,
      });
    const id = create.body.meeting.id;

    const res = await request(app).get(`/api/meetings/${id}/export.md`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/markdown/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="export-me-2025-11-01.md"/);
    expect(res.text).toContain("# Export me");
    expect(res.text).toContain("## Action Items");
  });
});
