CREATE TABLE IF NOT EXISTS "sources" (
  "id" serial PRIMARY KEY,
  "code" varchar(80) NOT NULL UNIQUE,
  "display_name" varchar(160) NOT NULL,
  "terms_url" text,
  "attribution_text" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "competitions" (
  "id" serial PRIMARY KEY,
  "canonical_name" varchar(180) NOT NULL,
  "country_code" varchar(2),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "competitions_name_country_uq" ON "competitions" ("canonical_name", "country_code");

CREATE TABLE IF NOT EXISTS "competition_aliases" (
  "id" serial PRIMARY KEY,
  "competition_id" integer NOT NULL REFERENCES "competitions"("id"),
  "source_code" varchar(80) NOT NULL,
  "external_competition_id" varchar(160),
  "source_name" varchar(180) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "competition_alias_source_external_uq" ON "competition_aliases" ("source_code", "external_competition_id");
CREATE INDEX IF NOT EXISTS "competition_alias_source_name_idx" ON "competition_aliases" ("source_code", "source_name");

CREATE TABLE IF NOT EXISTS "teams" (
  "id" serial PRIMARY KEY,
  "canonical_name" varchar(180) NOT NULL UNIQUE,
  "country_code" varchar(2),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "team_aliases" (
  "id" serial PRIMARY KEY,
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "source_code" varchar(80) NOT NULL,
  "external_team_id" varchar(160),
  "source_name" varchar(180) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_alias_source_external_uq" ON "team_aliases" ("source_code", "external_team_id");
CREATE INDEX IF NOT EXISTS "team_alias_source_name_idx" ON "team_aliases" ("source_code", "source_name");

CREATE TABLE IF NOT EXISTS "fixtures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "competition_id" integer NOT NULL REFERENCES "competitions"("id"),
  "season" varchar(40) NOT NULL,
  "home_team_id" integer NOT NULL REFERENCES "teams"("id"),
  "away_team_id" integer NOT NULL REFERENCES "teams"("id"),
  "kickoff_at" timestamptz NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'scheduled',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "fixtures_distinct_teams_ck" CHECK ("home_team_id" <> "away_team_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fixtures_canonical_identity_uq" ON "fixtures" ("competition_id", "season", "home_team_id", "away_team_id", "kickoff_at");
CREATE INDEX IF NOT EXISTS "fixtures_kickoff_idx" ON "fixtures" ("kickoff_at");
CREATE INDEX IF NOT EXISTS "fixtures_competition_season_idx" ON "fixtures" ("competition_id", "season");

CREATE TABLE IF NOT EXISTS "source_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_code" varchar(80) NOT NULL,
  "entity_type" varchar(40) NOT NULL,
  "external_id" varchar(180) NOT NULL,
  "retrieved_at" timestamptz NOT NULL DEFAULT now(),
  "source_updated_at" timestamptz,
  "payload" jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "source_records_identity_uq" ON "source_records" ("source_code", "entity_type", "external_id");
CREATE INDEX IF NOT EXISTS "source_records_retrieved_idx" ON "source_records" ("retrieved_at");

CREATE TABLE IF NOT EXISTS "fixture_source_links" (
  "id" serial PRIMARY KEY,
  "fixture_id" uuid NOT NULL REFERENCES "fixtures"("id"),
  "source_record_id" uuid NOT NULL REFERENCES "source_records"("id"),
  "external_fixture_id" varchar(180) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "fixture_source_link_uq" ON "fixture_source_links" ("fixture_id", "source_record_id");
CREATE UNIQUE INDEX IF NOT EXISTS "fixture_source_external_uq" ON "fixture_source_links" ("source_record_id", "external_fixture_id");

CREATE TABLE IF NOT EXISTS "match_results" (
  "fixture_id" uuid PRIMARY KEY REFERENCES "fixtures"("id"),
  "home_goals" integer NOT NULL CHECK ("home_goals" >= 0),
  "away_goals" integer NOT NULL CHECK ("away_goals" >= 0),
  "confirmed_at" timestamptz NOT NULL,
  "source_record_id" uuid REFERENCES "source_records"("id")
);

CREATE TABLE IF NOT EXISTS "ingestion_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_code" varchar(80) NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'running',
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,
  "records_fetched" integer NOT NULL DEFAULT 0,
  "records_accepted" integer NOT NULL DEFAULT 0,
  "records_rejected" integer NOT NULL DEFAULT 0,
  "error_summary" text
);
CREATE INDEX IF NOT EXISTS "ingestion_runs_source_started_idx" ON "ingestion_runs" ("source_code", "started_at");

CREATE TABLE IF NOT EXISTS "model_versions" (
  "id" serial PRIMARY KEY,
  "version" varchar(80) NOT NULL UNIQUE,
  "code_revision" varchar(80),
  "configuration" jsonb NOT NULL,
  "validation_summary" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "predictions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fixture_id" uuid NOT NULL REFERENCES "fixtures"("id"),
  "market" varchar(40) NOT NULL,
  "probabilities" jsonb NOT NULL,
  "model_version_id" integer NOT NULL REFERENCES "model_versions"("id"),
  "generated_at" timestamptz NOT NULL,
  "published_at" timestamptz,
  "input_snapshot" jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS "predictions_fixture_market_idx" ON "predictions" ("fixture_id", "market");
CREATE INDEX IF NOT EXISTS "predictions_published_idx" ON "predictions" ("published_at");

CREATE TABLE IF NOT EXISTS "prediction_outcomes" (
  "id" serial PRIMARY KEY,
  "prediction_id" uuid NOT NULL UNIQUE REFERENCES "predictions"("id"),
  "settlement_status" varchar(24) NOT NULL DEFAULT 'pending',
  "outcome" varchar(24),
  "settled_at" timestamptz,
  "settlement_source_record_id" uuid REFERENCES "source_records"("id")
);

CREATE TABLE IF NOT EXISTS "imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_name" varchar(255) NOT NULL,
  "imported_at" timestamptz NOT NULL DEFAULT now(),
  "status" varchar(24) NOT NULL,
  "rows_read" integer NOT NULL DEFAULT 0,
  "rows_accepted" integer NOT NULL DEFAULT 0,
  "rows_rejected" integer NOT NULL DEFAULT 0,
  "validation_report" jsonb
);