# PUNTER AI — Architecture Foundation

**Status:** Initial architecture proposal; implementation has not started.

## 1. System boundaries

PUNTER AI is a private web application. It has no Telegram dependency and must not share runtime, credentials, databases, or prediction logic with VELTRIX projects.

Logical layers:

1. **Presentation** — private, responsive dashboard.
2. **Application API** — authenticated operations for fixtures, predictions, imports, results, and reporting.
3. **Ingestion adapters** — one adapter per external source and one CSV importer.
4. **Normalization and quality** — canonical team/competition identities, timezone normalization, duplicate detection, source reconciliation, validation.
5. **Persistence** — PostgreSQL archive with source provenance and immutable prediction snapshots.
6. **Statistics** — team form, home/away splits, competition baselines, strength estimates.
7. **Prediction engine** — independent probability model and market derivation.
8. **Evaluation and settlement** — chronological backtesting, calibration, outcome settlement, performance metrics.
9. **Operations** — scheduled collection, retry policy, audit logs, health checks, and backup/restore procedures.

External providers must never be called directly by the prediction model. The model consumes normalized, persisted data.

## 2. Provider strategy and $0 constraint

### Primary target
5DollarFootballAPI free Community Access.

Activation, current terms, exact endpoint schemas, country-pack availability, competition coverage, historical depth, odds availability, and request quotas must be verified before production use.

### Secondary sources
Candidate free sources may be added only after checking:
- Explicit permission and applicable license/terms.
- Competition and season coverage.
- Update cadence and historical depth.
- API limits and stability.
- Field definitions, timezone conventions, and data quality.

A source is not accepted merely because it has a free endpoint or downloadable data.

### Resilience
- Provider adapters are replaceable.
- Persist every accepted source observation with provider, retrieval time, source update time when available, and external identifier.
- Preserve raw source payloads where terms permit.
- Reconcile conflicting records explicitly; never silently overwrite a confirmed result.
- CSV import is a controlled fallback with validation and an import audit trail.
- No paid tier, trial that later bills, or paid infrastructure dependency is permitted.

## 3. Canonical data model

Initial PostgreSQL entities:

- `sources` — provider identity, terms/attribution notes, enabled state.
- `ingestion_runs` — run status, timestamps, counts, errors, and source.
- `source_records` — source identifiers, retrieval metadata, raw payload or permitted payload reference, normalized record link.
- `competitions` — canonical competition identity and country.
- `competition_seasons` — season identifiers and coverage windows.
- `teams` — canonical team identity.
- `team_aliases` — source-specific names/IDs mapped to canonical teams.
- `fixtures` — kickoff, competition/season, home/away teams, status.
- `match_results` — final score, status, confirmation provenance.
- `team_match_statistics` — only fields actually supplied by verified sources or computed internally; each field carries provenance.
- `predictions` — fixture, market, selection probabilities, model version, generated/published timestamps, input snapshot reference.
- `prediction_outcomes` — settlement state and result.
- `model_versions` — model configuration, code revision, training cutoff, validation summary.
- `imports` — CSV import metadata, validation errors, accepted/rejected counts.

Use stable internal IDs and unique constraints for source identities. Store timestamps in UTC and render them in the user's local timezone (WAT by default). Preserve source timestamps separately from ingestion timestamps.

## 4. Ingestion and reconciliation lifecycle

1. Schedule or manually initiate a source pull.
2. Record an ingestion run before requesting data.
3. Fetch only documented endpoints and respect provider quotas.
4. Validate response shape, status, timestamps, IDs, and required fields.
5. Normalize competition, season, team, fixture, and result identities.
6. Match source records to canonical entities using stable IDs first; aliases are controlled mappings, not fuzzy auto-merges.
7. Detect duplicates and conflicting fixture/result observations.
8. Persist accepted records and provenance transactionally.
9. Quarantine ambiguous or invalid records for review.
10. Record counts, errors, and completion state.

A failed source must not erase previously stored records. Retries must be bounded, back off, and remain within free request limits.

## 5. Prediction model boundary

Initial candidate: attack/defence strength with competition scoring baselines and a Poisson scoreline matrix.

Potential inputs, only where sufficiently available:
- Historical goals for and against.
- Home/away splits.
- Competition scoring rates and home advantage.
- Opponent strength.
- Recency-weighted form with shrinkage for small samples.

Derived markets:
- 1X2.
- BTTS Yes/No.
- Over/Under 1.5 goals.
- Over/Under 2.5 goals.

The model must not:
- Copy a provider's forecast probabilities.
- Invent missing statistics.
- Treat unavailable xG, lineups, injuries, or odds as known.
- Force a prediction for every fixture.
- Train or evaluate with information occurring after the prediction timestamp.

Every published prediction stores the model version, data cutoff, probability vector, and reproducible input snapshot/reference.

## 6. Publication and evaluation gates

Do not publish a forecast when:
- Fixture identity, kickoff, or status is uncertain.
- Required team/competition history is insufficient.
- Source conflicts are unresolved.
- Inputs are stale or fail validation.
- Model output is invalid or uncalibrated for the target market.

Evaluate chronologically with strict prevention of future-data leakage. Report sample size and uncertainty alongside hit rate. Track Brier score, log loss, calibration, market-specific performance, and dated prospective results. Do not label a strategy profitable without a sufficiently large, independently evaluated sample and reliable odds/outcome records.

Predictions are immutable after publication. Corrections are represented by explicit superseding records, never by silently rewriting historical forecasts.

## 7. Security and privacy

- Keep the dashboard private and require authentication.
- Store API keys and database credentials only in environment secrets.
- Never commit secrets, tokens, personal data, or production database URLs.
- Use least-privilege credentials and redact secrets from logs.
- Validate and limit CSV uploads.
- Maintain backups and test restoration before relying on the archive.

## 8. Initial delivery sequence

1. Repository documentation and architecture baseline.
2. Technology/runtime selection and minimal application skeleton.
3. Database schema and migrations.
4. Source adapter interface and CSV import contract.
5. Primary provider contract tests and free-tier coverage audit.
6. Ingestion, normalization, provenance, and reconciliation.
7. Historical archive and data-quality reporting.
8. Statistical feature generation.
9. Independent prediction engine and unit tests.
10. Walk-forward validation and calibration.
11. Private dashboard, prediction history, and settlement.
12. Scheduled operations, monitoring, backup, and release checks.

## 9. Explicitly unverified

This document is a design baseline, not evidence of a working system. Provider access, source coverage, database provisioning, deployment, scheduled jobs, and prediction quality remain unverified until tested and logged in `docs/PROGRESS.md`.
