import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  termsUrl: text("terms_url"),
  attributionText: text("attribution_text"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  canonicalName: varchar("canonical_name", { length: 180 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("competitions_name_country_uq").on(table.canonicalName, table.countryCode)]);

export const competitionAliases = pgTable("competition_aliases", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id),
  sourceCode: varchar("source_code", { length: 80 }).notNull(),
  externalCompetitionId: varchar("external_competition_id", { length: 160 }),
  sourceName: varchar("source_name", { length: 180 }).notNull()
}, (table) => [
  uniqueIndex("competition_alias_source_external_uq").on(table.sourceCode, table.externalCompetitionId),
  index("competition_alias_source_name_idx").on(table.sourceCode, table.sourceName)
]);

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  canonicalName: varchar("canonical_name", { length: 180 }).notNull().unique(),
  countryCode: varchar("country_code", { length: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const teamAliases = pgTable("team_aliases", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  sourceCode: varchar("source_code", { length: 80 }).notNull(),
  externalTeamId: varchar("external_team_id", { length: 160 }),
  sourceName: varchar("source_name", { length: 180 }).notNull()
}, (table) => [
  uniqueIndex("team_alias_source_external_uq").on(table.sourceCode, table.externalTeamId),
  index("team_alias_source_name_idx").on(table.sourceCode, table.sourceName)
]);

export const fixtures = pgTable("fixtures", {
  id: uuid("id").defaultRandom().primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id),
  season: varchar("season", { length: 40 }).notNull(),
  homeTeamId: integer("home_team_id").notNull().references(() => teams.id),
  awayTeamId: integer("away_team_id").notNull().references(() => teams.id),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("fixtures_distinct_teams_ck", `${table.homeTeamId.name} <> ${table.awayTeamId.name}`),
  uniqueIndex("fixtures_canonical_identity_uq").on(
    table.competitionId, table.season, table.homeTeamId, table.awayTeamId, table.kickoffAt
  ),
  index("fixtures_kickoff_idx").on(table.kickoffAt),
  index("fixtures_competition_season_idx").on(table.competitionId, table.season)
]);

export const sourceRecords = pgTable("source_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceCode: varchar("source_code", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  externalId: varchar("external_id", { length: 180 }).notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  payload: jsonb("payload").notNull()
}, (table) => [
  uniqueIndex("source_records_identity_uq").on(table.sourceCode, table.entityType, table.externalId),
  index("source_records_retrieved_idx").on(table.retrievedAt)
]);

export const fixtureSourceLinks = pgTable("fixture_source_links", {
  id: serial("id").primaryKey(),
  fixtureId: uuid("fixture_id").notNull().references(() => fixtures.id),
  sourceRecordId: uuid("source_record_id").notNull().references(() => sourceRecords.id),
  externalFixtureId: varchar("external_fixture_id", { length: 180 }).notNull()
}, (table) => [
  uniqueIndex("fixture_source_link_uq").on(table.fixtureId, table.sourceRecordId),
  uniqueIndex("fixture_source_external_uq").on(table.sourceRecordId, table.externalFixtureId)
]);

export const matchResults = pgTable("match_results", {
  fixtureId: uuid("fixture_id").primaryKey().references(() => fixtures.id),
  homeGoals: integer("home_goals").notNull(),
  awayGoals: integer("away_goals").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
  sourceRecordId: uuid("source_record_id").references(() => sourceRecords.id)
}, (table) => [
  check("match_results_home_goals_nonnegative_ck", `${table.homeGoals.name} >= 0`),
  check("match_results_away_goals_nonnegative_ck", `${table.awayGoals.name} >= 0`)
]);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceCode: varchar("source_code", { length: 80 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  recordsFetched: integer("records_fetched").notNull().default(0),
  recordsAccepted: integer("records_accepted").notNull().default(0),
  recordsRejected: integer("records_rejected").notNull().default(0),
  errorSummary: text("error_summary")
}, (table) => [index("ingestion_runs_source_started_idx").on(table.sourceCode, table.startedAt)]);

export const modelVersions = pgTable("model_versions", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 80 }).notNull().unique(),
  codeRevision: varchar("code_revision", { length: 80 }),
  configuration: jsonb("configuration").notNull(),
  validationSummary: jsonb("validation_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const predictions = pgTable("predictions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fixtureId: uuid("fixture_id").notNull().references(() => fixtures.id),
  market: varchar("market", { length: 40 }).notNull(),
  probabilities: jsonb("probabilities").notNull(),
  modelVersionId: integer("model_version_id").notNull().references(() => modelVersions.id),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  inputSnapshot: jsonb("input_snapshot").notNull()
}, (table) => [
  index("predictions_fixture_market_idx").on(table.fixtureId, table.market),
  index("predictions_published_idx").on(table.publishedAt)
]);

export const predictionOutcomes = pgTable("prediction_outcomes", {
  id: serial("id").primaryKey(),
  predictionId: uuid("prediction_id").notNull().unique().references(() => predictions.id),
  settlementStatus: varchar("settlement_status", { length: 24 }).notNull().default("pending"),
  outcome: varchar("outcome", { length: 24 }),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  settlementSourceRecordId: uuid("settlement_source_record_id").references(() => sourceRecords.id)
});

export const imports = pgTable("imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  status: varchar("status", { length: 24 }).notNull(),
  rowsRead: integer("rows_read").notNull().default(0),
  rowsAccepted: integer("rows_accepted").notNull().default(0),
  rowsRejected: integer("rows_rejected").notNull().default(0),
  validationReport: jsonb("validation_report")
});
