# Pitchsense — AI Meeting Notes & Action Tracker

A full-stack TypeScript app that turns pasted meeting transcripts into
structured summaries, key decisions, open questions, and editable action
items. Built for the SDE I take-home: Node + Express backend, React +
Vite frontend, SQLite storage, OpenAI for extraction.

---

## Architecture

```
┌───────────────────┐     REST /api      ┌──────────────────────────┐
│ React + Vite UI   │ ─────────────────► │ Express API (TypeScript) │
│  TanStack Query   │ ◄───────────────── │  controllers → services  │
│  Tailwind CSS     │                    │  → repositories → SQLite │
└───────────────────┘                    │                          │
       port 3000                         │  MeetingExtractor (DI)   │
                                         └──────────┬───────────────┘
                                                    │ strict json_schema
                                                    ▼
                                         ┌──────────────────────────┐
                                         │ OpenAI gpt-4o-mini       │
                                         └──────────────────────────┘
                                                  port 8000
```

### Design at a glance

- **Backend — layered architecture** with constructor-injected dependencies
  composed in [`backend/src/app.ts`](backend/src/app.ts):

  ```
  Routes  ──►  Controllers  ──►  Services  ──►  Repositories  ──►  SQLite
                                       │
                                       ▼
                              MeetingExtractor (strategy)
                                       │
                                       ▼
                              OpenAiExtractor (impl)
  ```

  - **Controllers** are thin (parse request → call service → render JSON).
  - **Services** own business logic and throw typed `HttpError` subclasses.
  - **Repositories** are one-per-aggregate (Meeting / Summary / ActionItem).
  - **`MeetingExtractor`** is an interface; today only `OpenAiExtractor`
    implements it. Swapping for a mock or local model is a one-file change
    in the composition root.
  - **Validation** uses Zod schemas grouped by entity; the same
    `ExtractionResultSchema` is both the response validator AND the
    JSON Schema we hand to OpenAI's strict structured-output mode.
  - **Errors** are a small class hierarchy (`HttpError`, `BadRequestError`,
    `NotFoundError`, `ConfigurationError`, `LlmError`) rendered by a
    single error middleware into a stable envelope.

- **Frontend — feature-based ("vertical slice") architecture**:
  every feature owns its API hooks, components, and pages. Shared UI
  primitives sit in `components/ui/` and `components/layout/`.

  ```
  src/
    app/                    application shell (App, providers, routes)
    lib/                    apiClient, queryClient, queryKeys, helpers
    types/                  shared API types
    components/
      ui/                   Spinner, ErrorBanner, badges, EmptyState
      layout/               Header, NavTab
    features/
      meetings/{api,components,pages}
      action-items/{api,components,pages}
  ```

- **Storage**: SQLite via `better-sqlite3` at `backend/data/app.db`.
  Migrations are idempotent `CREATE TABLE IF NOT EXISTS` statements run
  on every connection open ([`backend/src/infrastructure/database/migrations.ts`](backend/src/infrastructure/database/migrations.ts)).

- **Extraction is synchronous** inside the create / regenerate request.
  The `extraction_status` column (`pending` / `processing` / `completed`
  / `failed`) is still updated end-to-end so the pattern generalises to
  async if you want to evolve it later.

### Data model

| Table               | Columns (abridged)                                              |
| ------------------- | --------------------------------------------------------------- |
| `meetings`          | id, title, date, participants (JSON), raw_transcript, extraction_status, extraction_error, timestamps |
| `meeting_summaries` | meeting_id (PK FK), summary, key_decisions (JSON), open_questions (JSON), generated_at |
| `action_items`      | id, meeting_id (FK, cascade), owner, task_description, due_date, priority, status, source_quote, timestamps |

---

## Setup (one command)

Prereqs: Node 18+ (tested on 20 and 24), an OpenAI API key.

```bash
cd Pitchsense-ai
npm run install:all                    # installs root + backend + frontend
cp backend/.env.example backend/.env   # then add your OPENAI_API_KEY
npm run dev                            # starts backend (8000) + frontend (3000)
```

Open <http://localhost:3000>.

To run the test suite:

```bash
npm test                               # runs backend Vitest suites
```

### Environment variables (`backend/.env`)

| Var              | Default        | Notes                                      |
| ---------------- | -------------- | ------------------------------------------ |
| `OPENAI_API_KEY` | _required_     | Without it, extraction endpoints return 500 with a clear message. |
| `OPENAI_MODEL`   | `gpt-4o-mini`  | Any chat model that supports strict json_schema response format. |
| `PORT`           | `8000`         | Backend HTTP port.                         |
| `DB_PATH`        | `./data/app.db`| Anything except `:memory:` is persisted to disk. |

The frontend dev server runs on port **3000** and proxies `/api` to the
backend at `http://localhost:8000` (see
[`frontend/vite.config.ts`](frontend/vite.config.ts)). Override via
`VITE_BACKEND_URL` if needed.

### Trying it out quickly

`samples/transcript-product-sync.txt` and
`samples/transcript-engineering-standup.txt` are two realistic transcripts
designed to exercise every extracted field (decisions with quotes, action
items with owners and explicit due dates, open questions, mixed priorities).
Paste one into the **New meeting** form to see end-to-end extraction.

---

## API overview

All responses are JSON. Errors use a consistent envelope:

```json
{ "error": { "code": "BAD_REQUEST", "message": "...", "details": { ... } } }
```

| Method | Path                                | Description                                                |
| ------ | ----------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/health`                       | Liveness probe                                             |
| GET    | `/api/meetings`                     | List meetings with status + action item count              |
| POST   | `/api/meetings`                     | Create meeting **and** run AI extraction synchronously     |
| GET    | `/api/meetings/:id`                 | Full detail (meeting + summary + action items)             |
| DELETE | `/api/meetings/:id`                 | Cascade-delete                                             |
| POST   | `/api/meetings/:id/regenerate`      | Re-run extraction; replaces summary + action items         |
| GET    | `/api/meetings/:id/export.md`       | Markdown download (Bonus A)                                |
| PATCH  | `/api/action-items/:id`             | Partial update (`owner`, `task_description`, `due_date`, `priority`, `status`) |
| GET    | `/api/action-items?owner=...&status=...&priority=...&due_before=...&overdue=true` | Cross-meeting list with filters (Bonus B) |

Validation is enforced with Zod at every entry point; invalid bodies
return `400` with a flattened error map.

---

## What the LLM contract looks like

The single OpenAI call returns this exact shape, validated by Zod after
parsing:

```jsonc
{
  "summary": "3-6 sentence concise summary…",
  "key_decisions": [
    { "text": "…", "source_quote": "verbatim or null" }
  ],
  "open_questions": ["…"],
  "action_items": [
    {
      "owner": "Named person or 'Unassigned'",
      "task_description": "…",
      "due_date": "YYYY-MM-DD or null",
      "priority": "low | medium | high",
      "source_quote": "verbatim or null"
    }
  ]
}
```

The schema is normalised before being sent to OpenAI:
`additionalProperties: false` on every object, every property in
`required`, and nullable fields collapsed from
`anyOf: [..., null]` to `type: ["string", "null"]`. This is exercised by
`tests/llmSchema.test.ts` so a regression in `zod-to-json-schema` would
fail the test suite before reaching the API.

---

## Assumptions

- **Single-user, no auth.** Anyone with access to the local server can
  read or modify any meeting.
- **Synchronous extraction.** The `POST /api/meetings` request blocks
  until OpenAI replies (typically 3–8s for `gpt-4o-mini`). For longer
  transcripts the request can take 10–20s. A background queue would be
  the next step (see "Improvements").
- **Real OpenAI required.** Per the spec we explicitly chose to wire a
  real provider rather than a mock. The API key lives in
  `backend/.env`; without it extraction endpoints return 500.
- **Transcript size.** The Express body limit is 2 MB which comfortably
  covers ~250k characters. We do not currently chunk; an hour-long
  meeting transcript should still fit in the `gpt-4o-mini` context
  window, but multi-pass summarisation would be needed for longer.
- **Due dates from natural language.** We instruct the model to return
  `due_date` only when an explicit calendar date is mentioned. "By next
  week" is intentionally returned as `null` rather than guessed.

## Limitations

- No undo on delete.
- No optimistic UI for action item updates — we wait for the PATCH to
  succeed before invalidating queries (deliberate trade-off: simpler,
  less stale data after errors).
- Markdown export is server-rendered (so the contract stays in one
  place). The "Copy markdown" button still issues a fetch.
- No pagination on the meetings list or the cross-meeting action
  dashboard; fine for a take-home, not for production.
- No rate-limiting on the extraction endpoint.

## What I'd improve with more time

1. **Async extraction with a job queue.** Move extraction off the request
   thread (BullMQ or a simple SQLite-backed jobs table), expose
   `extraction_status` via SSE/polling. Today the status column exists
   and is updated correctly, but the request still blocks.
2. **Eval harness with golden transcripts.** Maintain ~20 transcripts
   with hand-annotated expected outputs and run a CI eval that scores
   accuracy on each field (precision/recall on action items, decisions,
   etc.). Use it to A/B prompts and models.
3. **Chunked extraction for long meetings.** Split transcript into
   overlapping chunks, extract per-chunk, then merge with a second
   reduce-style LLM call. Today the whole transcript is passed in one
   shot.
4. **Prompt iteration on edge cases.** Owners often have nicknames or
   role-only references ("the PM"). A dedicated normalisation pass over
   participants would help, possibly with a `participants` system
   message providing the canonical names.
5. **Bonus C — search.** Add SQLite FTS5 over `raw_transcript`, summary
   text, decision text, and action item text. Document keyword vs.
   AI-assisted clearly.
6. **Inline assistant chat per meeting.** "What did we say about
   pricing?" answered from the transcript with retrieval.
7. **Optimistic mutations and undo toasts** on PATCH/DELETE.
8. **End-to-end tests** with Playwright covering paste → extract → edit
   → mark done.

---

## Trade-offs (what I skipped and why)

- **Bonus C — Search.** Skipped in favour of polishing the core flow and
  delivering Bonus A + B end-to-end. SQLite FTS5 would be the
  straightforward path; ~half a day of work to do well.
- **Async job queue.** Out of scope for a 12–24h SDE I assignment. Sync
  extraction with clear status tracking covers the spec without adding
  operational complexity.
- **Mock LLM mode.** We discussed and chose a real-only integration. The
  `MeetingExtractor` interface in
  [`backend/src/services/MeetingExtractor.ts`](backend/src/services/MeetingExtractor.ts)
  is the strategy boundary, so adding a `MockExtractor` and selecting it
  in [`backend/src/app.ts`](backend/src/app.ts) is a one-file change.
- **DI container.** Manual constructor injection in the composition
  root is sufficient at this size; a framework (tsyringe / awilix) would
  add ceremony without solving a real problem.

---

## Repo layout

```
Pitchsense-ai/
├── backend/
│   ├── src/
│   │   ├── server.ts                       # entry point
│   │   ├── app.ts                          # composition root (DI wiring)
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── errors/
│   │   │   ├── HttpError.ts                # + BadRequest / NotFound / Configuration
│   │   │   ├── LlmError.ts
│   │   │   └── index.ts
│   │   ├── validation/                     # Zod schemas, grouped by entity
│   │   │   ├── common.schema.ts
│   │   │   ├── meeting.schema.ts
│   │   │   ├── actionItem.schema.ts
│   │   │   └── extraction.schema.ts
│   │   ├── models/                         # domain entity types (no behaviour)
│   │   │   ├── meeting.model.ts
│   │   │   ├── summary.model.ts
│   │   │   ├── actionItem.model.ts
│   │   │   └── meetingDetail.model.ts
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   ├── connection.ts           # better-sqlite3 + WAL + FK
│   │   │   │   └── migrations.ts
│   │   │   └── openai/
│   │   │       ├── OpenAiExtractor.ts      # MeetingExtractor strategy impl
│   │   │       ├── jsonSchema.ts           # strict-mode normalisation
│   │   │       └── prompt.ts
│   │   ├── repositories/                   # one per aggregate
│   │   │   ├── MeetingRepository.ts
│   │   │   ├── SummaryRepository.ts
│   │   │   └── ActionItemRepository.ts
│   │   ├── services/                       # business logic
│   │   │   ├── MeetingExtractor.ts         # strategy interface
│   │   │   ├── ExtractionService.ts
│   │   │   ├── MeetingService.ts
│   │   │   ├── ActionItemService.ts
│   │   │   └── MarkdownService.ts
│   │   ├── controllers/                    # thin HTTP handlers
│   │   │   ├── HealthController.ts
│   │   │   ├── MeetingController.ts
│   │   │   └── ActionItemController.ts
│   │   ├── middleware/
│   │   │   ├── asyncHandler.ts
│   │   │   ├── validate.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── notFound.ts
│   │   └── routes/
│   │       ├── health.routes.ts
│   │       ├── meeting.routes.ts
│   │       └── actionItem.routes.ts
│   └── tests/                              # Vitest + supertest
│       ├── schemas.test.ts
│       ├── llmSchema.test.ts
│       └── actionItems.test.ts
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── app/
│       │   ├── App.tsx
│       │   ├── AppProviders.tsx            # QueryClient + Router
│       │   └── AppRoutes.tsx
│       ├── lib/
│       │   ├── apiClient.ts                # fetch wrapper + ApiError
│       │   ├── queryClient.ts
│       │   ├── queryKeys.ts                # centralised key factory
│       │   └── formatDate.ts
│       ├── types/
│       │   └── api.ts
│       ├── components/
│       │   ├── ui/                         # Spinner, ErrorBanner, badges, EmptyState
│       │   └── layout/                     # Header, NavTab
│       ├── features/
│       │   ├── meetings/
│       │   │   ├── api/                    # meetingsApi + useMeetings hooks
│       │   │   ├── components/             # MeetingsTable, MeetingForm, *Card
│       │   │   └── pages/                  # List, New, Detail
│       │   └── action-items/
│       │       ├── api/                    # actionItemsApi + useActionItems hooks
│       │       ├── components/             # ActionItemCard, Filters, StatCard
│       │       └── pages/                  # ActionItemsDashboardPage
│       └── styles.css
├── samples/                                # two realistic transcripts
└── package.json                            # root: install:all, dev, build, test
```
