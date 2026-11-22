# PUNTER AI — Ingestion and Data Integrity Pipeline

## Purpose

Ingestion converts provider responses and validated manual imports into canonical football records without losing provenance or silently resolving ambiguity. The pipeline is independent of any specific provider and must run identically for API feeds and CSV imports.

## Invariants

1. Every accepted source record retains its source identity, retrieval/import timestamp, payload hash, and raw payload or immutable raw-object reference.
2. Reprocessing the same source record is idempotent: it updates the same canonical link and does not create duplicate fixtures, results, or ingestion events.
3. Provider IDs are scoped by source. An external ID from one provider must never collide with an ID from another.
4. Team and competition matching is explicit and auditable. Fuzzy similarity may suggest candidates but must never silently merge entities.
5. A finished score is accepted only when the source status explicitly confirms a completed match and both scores are valid non-negative integers.
6. Conflicting results are quarantined; latest timestamp alone is not sufficient to overwrite a confirmed result.
7. Ingestion failure must not partially publish canonical data. Each batch has a durable run record and transactional commit boundaries.
8. No fixture becomes prediction-eligible merely because it was ingested.

## Pipeline

```text
Source fetch / CSV upload
        |
        v
Raw payload capture + content hash
        |
        v
Schema and source-contract validation
        |
        v
Provider-specific mapping to canonical records
        |
        v
Competition + team identity resolution
        |
        v
Fixture identity and duplicate resolution
        |
        v
Result validation and conflict detection
        |
        +---- rejected/ambiguous ----> quarantine + audit reason
        |
        v
Transactional canonical upsert
        |
        v
Freshness, provenance, and quality scoring
        |
        v
Archive update; prediction eligibility evaluated separately
```

## Canonical identity strategy

### Source record

Use a unique key on `(source_id, external_record_id)`. Store:
- external record ID;
- record type and source schema/version;
- fetched/imported timestamp;
- provider event timestamp, when supplied;
- normalized payload hash;
- raw JSON payload or immutable object reference;
- mapping version;
- ingestion run ID;
- validation state and rejection reason.

If the same key arrives with the same hash, record a no-op/replay event. If the key arrives with a different hash, preserve the new snapshot and compare material fields before applying changes.

### Competition and team resolution

Resolution order:
1. Exact source-scoped alias match.
2. Exact normalized canonical name plus country/competition context.
3. Curated alias mapping.
4. Candidate generation using normalized tokens and known metadata.

Steps 1–3 may resolve automatically when unambiguous. Step 4 is suggestion-only and enters quarantine for review. Never merge two canonical teams solely because their names are similar; women/reserve/youth suffixes and country context are identity-bearing.

Aliases are unique within their source and entity type. Preserve original source spelling.

### Fixture identity

Primary key: canonical fixture ID. Source link uniqueness: `(source_id, external_fixture_id)`.

A fixture may be linked across providers only when a deterministic match is established using:
- resolved home and away team IDs;
- competition/season identity;
- kickoff timestamp within a configurable tolerance;
- home/away orientation;
- match status and round context where available.

A candidate with multiple plausible matches is quarantined. Do not deduplicate by team names and date alone.

Kickoff corrections are updates to the same fixture when source identity is stable. Keep old and new values in source snapshots/audit history.

## Result acceptance and conflicts

Accept a result only if:
- source status is explicitly `finished` (or a separately verified equivalent from an accepted source contract);
- home and away scores are present;
- both scores are integers greater than or equal to zero;
- fixture identity is resolved;
- the result is not a duplicate of an existing accepted result.

Conflict rules:
- Same score from another source: add corroborating provenance; do not create another result.
- Different score from a source with lower trust: quarantine the candidate and retain the accepted result.
- Different score from an equally trusted or higher-trusted source: mark the fixture as result-conflicted and suspend settlement/model training until resolved.
- A correction from the original source: retain both source snapshots and record a correction event; update the canonical result only after source contract and correction semantics are verified.
- Abandoned, postponed, cancelled, awarded, walkover, and unknown states are not ordinary finished-score results. Route them through explicit status handling; never infer a score.

## Transaction and retry design

Each run has:
- immutable run ID;
- source and mode (scheduled API, manual API request, CSV import);
- requested time range/cursor;
- started/completed timestamps;
- request/page counts and rate-limit observations;
- received, mapped, inserted, updated, unchanged, rejected, quarantined, and conflicted counts;
- outcome: `running`, `succeeded`, `partial`, or `failed`;
- sanitized error summary.

Fetch and validate outside the canonical write transaction. Then commit accepted source snapshots, canonical upserts, links, and run counters in bounded transactions. A crash before commit must be safe to retry. A crash after commit must be detected by idempotency keys.

Retry only transient network errors, 429, and eligible 5xx responses. Honor `Retry-After` and provider rate-limit headers. Use bounded exponential backoff with jitter and a maximum attempt count. Never retry schema errors, authentication failures, invalid identifiers, or rejected records without changing the input or contract.

## Quarantine

Quarantine records are durable and inspectable. Each entry contains:
- source record/run reference;
- raw payload reference;
- reason code and human-readable explanation;
- candidate canonical entity/fixture IDs, if any;
- severity and whether manual resolution is required;
- creation time and resolution audit.

Suggested reason codes:
- `SCHEMA_INVALID`
- `MISSING_REQUIRED_FIELD`
- `UNKNOWN_COMPETITION`
- `AMBIGUOUS_COMPETITION`
- `UNKNOWN_TEAM`
- `AMBIGUOUS_TEAM`
- `AMBIGUOUS_FIXTURE`
- `DUPLICATE_SOURCE_ID_CONFLICT`
- `INVALID_SCORE`
- `UNCONFIRMED_FINISHED_STATUS`
- `RESULT_CONFLICT`
- `UNSUPPORTED_MATCH_STATUS`

Quarantined records never enter training, settlement, or prediction calculations.

## Quality and freshness scoring

Maintain separate dimensions rather than one opaque score:
- identity confidence;
- source reliability;
- payload completeness;
- result corroboration;
- freshness relative to the event type;
- conflict state.

A fixture is eligible for a downstream task only when it passes that task's explicit requirements. A fixture can be displayed in the archive while being ineligible for training or prediction.

## Metrics and observability

Expose per source and per run:
- success/partial/failure rate;
- latency and request count;
- rate-limit remaining/reset;
- duplicate/no-op rate;
- quarantine rate by reason;
- unresolved team/competition mappings;
- result conflict count;
- last successful fetch and latest event timestamp;
- coverage gaps by competition and date.

Never log API keys, connection strings, raw authorization headers, or unnecessary personal data.

## Implementation sequence

1. Add typed canonical ingestion DTOs and validators.
2. Add pure identity-key, normalization, and deterministic fixture-match helpers.
3. Add unit tests for idempotency, ambiguous matching, score/status validation, and conflicting results.
4. Add repository interfaces and a PostgreSQL implementation with unique constraints and transaction boundaries.
5. Connect the 5DollarFootballAPI adapter to the orchestrator after live provider acceptance.
6. Reuse the same orchestrator for CSV imports; the import path must not bypass validation or provenance.
7. Add an admin quarantine review workflow only after private authentication is implemented.

## Non-goals

- No automatic fuzzy team merges.
- No silent correction of conflicting results.
- No settlement from unknown or merely in-play statuses.
- No provider model probabilities or provider predictions in PUNTER AI's own model.
- No publication based solely on ingestion success.
