import {
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
  enabled: integer("enabled").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  canonicalName: varchar("canonical_name", { length: 180 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("competitions_name_country_uq").on(table.canonicalName, table.countryCode)]);

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

export const matchResults = pgTable("match_results", {
  fixtureId: uuid("fixture_id").primaryKey().references(() => fixtures.id),
  homeGoals: integer("home_goals").notNull(),
  awayGoals: integer("away_goals").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
  sourceRecordId: uuid("source_record_id").references(() => sourceRecords.id)
});

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
