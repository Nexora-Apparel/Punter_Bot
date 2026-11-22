# PUNTER AI

Private, personal-use football analytics and prediction platform.

## Project rules

- Strict $0 operating budget: no paid subscriptions, paid API plans, or paid data services.
- Primary provider target: 5DollarFootballAPI free Community Access, subject to account activation and endpoint/coverage verification.
- Supplementary sources may be integrated only after their access terms, reliability, coverage, and technical limits are checked.
- Keep a permanent PostgreSQL archive under PUNTER AI's control.
- Keep provider adapters separate from the prediction engine so providers can be replaced without rewriting model logic.
- Generate independent forecasts from underlying match data; do not copy provider-generated probabilities.
- Do not publish forecasts when the data-quality or sample-size gates fail.
- Keep this repository separate from all VELTRIX projects.

## Initial product scope

- Private, mobile-first web dashboard.
- Fixture and result ingestion with source provenance.
- Team/competition identity normalization and duplicate/conflict handling.
- Historical archive and derived team/competition statistics.
- Independent statistical prediction engine.
- Prediction history, settlement, and transparent performance evaluation.
- CSV import as a fallback and recovery path.

## Initial markets

- 1X2
- Both Teams To Score (BTTS)
- Over/Under 1.5 goals
- Over/Under 2.5 goals

Markets and publication rules may be expanded only with documented validation.

## Development

Requirements: Node.js 22 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `DATABASE_URL` only in local environment configuration or deployment secrets. Apply versioned SQL migrations with `npm run db:migrate`. Run quality checks with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Documentation

- [Progress log](docs/PROGRESS.md)
- [Architecture foundation](docs/ARCHITECTURE.md)

## Current status

The initial Next.js/TypeScript application and database/model scaffolding are on the working branch. CI, database provisioning, provider access, exact competition coverage, and historical data availability are not yet verified. No live predictions are being generated.
