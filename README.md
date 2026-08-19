# Pyrock AI — Multilingual Construction Assistant

Turns informal, multilingual construction-site messages ("Kal 100 cement bags aaye the, usme se
aaj 35 use hue.") into structured inventory events, using an LLM for language interpretation and
deterministic TypeScript for every number that matters.

**Core principle:** the LLM may interpret language. It never computes or returns the authoritative
inventory number — all arithmetic lives in application code.

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS (Express), TypeScript |
| Database | MongoDB (Mongoose) |
| AI | OpenAI (`gpt-4o-mini` by default), Structured Outputs (`json_schema`) |
| Validation | Zod (AI output gate) + class-validator (HTTP boundary) |
| Frontend | React 18 + Vite (plain React, not Next.js) |
| Shared | `packages/shared` — Zod schemas + TS types used by both apps |
| Testing | Jest (backend unit tests) |

## Repository layout

```
pyrock/
├── apps/
│   ├── backend/     NestJS API — messages, AI extraction, inventory
│   └── frontend/    React chat UI
├── packages/
│   └── shared/      Zod schemas + TS types shared by both apps
├── turbo.json
└── pnpm-workspace.yaml
```

## Architecture flow

```
POST /api/messages { messageId, siteId, text, timestamp }
        │
        ▼
Insert Message (status=PENDING), messageId has a UNIQUE index
   │  duplicate messageId → E11000 → return the existing record, stop here
   ▼
AI extraction (OpenAI, structured JSON output)
   │  provider error / timeout / malformed JSON → status=FAILED, reason recorded
   ▼
Zod validation (ValidatedEventSchema) + confidence threshold
   │  missing material/qty/unit, or low confidence → status=NEEDS_REVIEW, raw output stored,
   │  NO inventory mutation
   ▼
InventoryService.applyEvents — one atomic $inc per (siteId, material)
   ▼
status=PROCESSED, events persisted on the Message
```

The only code path that writes to `InventoryBalance` is the one after Zod validation has fully
passed. There is no route from raw model output to an inventory row that skips validation.

## Running locally

Prerequisites: Node 20+, pnpm (`corepack enable`), a MongoDB instance (local or Atlas), an OpenAI
API key.

```bash
pnpm install

cp apps/backend/.env.example apps/backend/.env    # fill in MONGODB_URI, OPENAI_API_KEY
cp apps/frontend/.env.example apps/frontend/.env  # defaults to http://localhost:4000/api

pnpm dev   # runs backend (:4000) and frontend (:5173) together via turbo
```

Backend Swagger docs: `http://localhost:4000/docs`.

Run backend unit tests: `pnpm --filter @pyrock/backend test`.

No local MongoDB? Quickest path is a throwaway container:
```bash
docker run -d --rm -p 27017:27017 mongo:7
```

## API surface

| Endpoint | Purpose |
|---|---|
| `POST /api/messages` | Submit a message; runs the full pipeline synchronously and returns the final status |
| `GET /api/messages?siteId=` | List messages (optionally filtered by site), most recent first |
| `PATCH /api/messages/:id/clarify` | Answer a clarifying question on a `NEEDS_REVIEW`/`FAILED` message; re-runs extraction on `originalText + answer` and resolves that *same* message in place (see below) |
| `GET /api/sites/:siteId/inventory` | Current material balances for a site |

All responses are wrapped as `{ success: true, data }` or `{ success: false, error: { message, code } }`.

## Design decisions (README questions)

**1. What does the LLM decide, and what does deterministic application code decide?**
The LLM (`apps/backend/src/modules/ai/ai-extraction.service.ts`) only decides *what happened*: it
reads the message and emits candidate events (`eventType`, `material`, `quantity`, `unit`,
`supplier`, a self-reported `confidence`) normalized to English. It never sees or computes a
running balance. Everything after that — schema validation, the confidence gate, and all
`received`/`consumed`/`quantity` arithmetic (`InventoryService.applyEvent`) — is plain TypeScript
with no model involved.

**2. How do you prevent a duplicate message from changing inventory twice?**
`messageId` has a unique index on the `messages` collection
(`modules/messages/schemas/message.schema.ts`). `MessagesService.create` tries to insert first; a
second submission with the same `messageId` fails the insert with Mongo's E11000 *before* the AI
call or any inventory write happens, and the existing record is returned as-is. This is enforced
at the DB layer, not just checked in application logic, so it holds even under concurrent duplicate
requests — there's no read-then-write window to race.

**3. What happens when the model returns invalid or incomplete data?**
Two independent gates, both before persistence:
- *Malformed/unreachable*: JSON parse failure, empty response, or a provider timeout/error →
  `AiMalformedOutputError` / `AiProviderError` → message status `FAILED`, reason recorded, no
  inventory touched.
- *Well-formed but incomplete/ambiguous*: passes JSON parsing but fails `ValidatedEventSchema`
  (e.g. `MATERIAL_RECEIVED` with `quantity: null`) or has confidence below
  `EXTRACTION_CONFIDENCE_THRESHOLD` → status `NEEDS_REVIEW`, raw model output stored for audit, no
  inventory mutation.

Both are real, visible states in the API and UI — never silently swallowed, never invented data.

**4. How would you redesign processing if hundreds of WhatsApp messages arrived simultaneously?**
Today processing is synchronous inside the POST handler — fine for a 4-hour prototype, and it's
what keeps the frontend simple (no polling). At real volume I'd move extraction off the request
path: `POST /api/messages` would only validate + insert the `PENDING` row (still gated by the same
unique index) and enqueue a job (BullMQ/SQS); a worker pool would call OpenAI, validate, and apply
inventory deltas, with the API exposing status via polling or a websocket/SSE push. The unique
index continues to be the idempotency backbone; workers would also need per-`(siteId, material)`
retry-safe writes, which `$inc` upserts already give for free. I'd add rate limiting against the
OpenAI API and a dead-letter queue for repeated extraction failures.

**5. If Pyrock deployed a separate instance per customer, how would you make deployments and
upgrades repeatable?**
Package the backend as a container image built in CI from a tagged commit; each customer gets a
declarative deployment manifest (Helm chart / Terraform module) parameterized by `MONGODB_URI`,
`OPENAI_API_KEY`, and `CORS_ORIGIN` — no per-customer forks of the code. Migrations would run as a
pre-deploy job, not on app boot. A single golden image promoted through
staging → per-customer canary → full rollout keeps every tenant on a known-good version, with the
manifest as the only source of per-tenant difference.

**6. What would you implement next with another full day?**
- A real integration test against `mongodb-memory-server` exercising the unique-index race directly
  (two concurrent `POST`s with the same `messageId`), instead of only unit-testing the service logic.
- ~~A clarification action for `NEEDS_REVIEW` messages so a human can supply the missing field~~ —
  implemented as `PATCH /api/messages/:id/clarify` (see below); next would be extending it to
  `FAILED`/`MALFORMED_OUTPUT` cases with a "did you mean...material" suggestion instead of a blank
  free-text box.
- Structured logging/tracing (OpenTelemetry) around the AI call, since provider latency/timeout
  behavior is the biggest operational unknown here.
- Rate limiting and basic auth on the API — both explicitly out of scope for this assignment but
  necessary before any real deployment.

## Other notable trade-offs

- **Negative inventory is allowed, not blocked.** A consumption message can arrive before its
  matching receipt (site reporting lags reality), and rejecting it would silently drop a real
  event. `InventoryService` lets `quantity` go negative and logs a warning; the frontend renders
  negative balances in red as a reconciliation signal. Blocking/clamping was the alternative
  considered — rejected because it hides information rather than surfacing it.
- **Single-document atomicity, not multi-document transactions.** Inventory updates use one atomic
  `findOneAndUpdate` with `$inc` per `(siteId, material)`, which MongoDB guarantees is race-free
  without needing a replica-set-backed multi-document transaction. Combined with the `messageId`
  unique index blocking reprocessing, this is sufficient for the assignment's idempotency
  requirement; a production system moving to fan-out across many collections per message would
  reach for transactions.
- **Confidence threshold is a blunt instrument.** `EXTRACTION_CONFIDENCE_THRESHOLD` (default 0.55)
  is model-self-reported, not calibrated against real data. It's a defensible starting knob, not a
  claim of precision — documented here rather than tuned further given the time-box.
- **Clarification resolves the same message, not a new one.** The frontend renders an assistant-style
  follow-up question under a `NEEDS_REVIEW`/`FAILED` message (e.g. "Which material was this about?").
  The reply hits `PATCH /api/messages/:id/clarify`, which mutates that *same* document rather than
  creating a new message — no extra chat turn, inventory updates directly. Concurrency safety reuses
  the same idea as the `messageId` unique index: `MessagesService.clarify` does one atomic
  `findOneAndUpdate({ _id, status: { $in: [NEEDS_REVIEW, FAILED] } }, { status: PENDING, ... })`, so
  two concurrent clarify calls for the same message can't both proceed to extraction/inventory — the
  status flip out of the reviewable set *is* the claim, decided by MongoDB, not application logic.

## Screens

The frontend adds a few interactive touches beyond the assignment's minimum: site/quick-example
chips, a Retry button scoped to transient provider errors only (content-related failures get the
clarify flow instead, since blindly resending the same text won't fix a missing material), and
friendly failure copy with a "details" toggle for the raw technical reason.
