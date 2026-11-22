import type { ProviderFixture, ProviderResult } from "../contracts";

export type FiveDollarLeagueMetadata = {
  countryCode?: string;
  currentSeason?: string;
};

export type FiveDollarFixture = {
  id: number;
  league: { id: number; name: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  kickoff_utc: string;
  status: "scheduled" | "in_play" | "finished" | "unknown";
  goals?: { home: number | null; away: number | null } | null;
};

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`5DollarFootballAPI fixture has invalid ${field}`);
  }
  return value.trim();
}

function requireId(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`5DollarFootballAPI fixture has invalid ${field}`);
  }
  return value;
}

export function mapFiveDollarFixture(
  raw: FiveDollarFixture,
  leagueMetadata: FiveDollarLeagueMetadata
): ProviderFixture {
  const fixtureId = requireId(raw?.id, "fixture id");
  const competitionId = requireId(raw?.league?.id, "league id");
  const homeTeamId = requireId(raw?.teams?.home?.id, "home team id");
  const awayTeamId = requireId(raw?.teams?.away?.id, "away team id");
  const kickoffAt = requireText(raw?.kickoff_utc, "kickoff_utc");

  if (!Number.isFinite(Date.parse(kickoffAt))) {
    throw new Error(`5DollarFootballAPI fixture ${fixtureId} has invalid kickoff_utc`);
  }
  if (homeTeamId === awayTeamId) {
    throw new Error(`5DollarFootballAPI fixture ${fixtureId} has identical team ids`);
  }

  const season = leagueMetadata.currentSeason ?? "unclassified";

  return {
    externalId: String(fixtureId),
    competitionExternalId: String(competitionId),
    competitionName: requireText(raw.league.name, "league name"),
    countryCode: leagueMetadata.countryCode,
    season,
    homeTeamExternalId: String(homeTeamId),
    homeTeamName: requireText(raw.teams.home.name, "home team name"),
    awayTeamExternalId: String(awayTeamId),
    awayTeamName: requireText(raw.teams.away.name, "away team name"),
    kickoffAt: new Date(kickoffAt).toISOString(),
    status: requireText(raw.status, "status"),
    raw
  };
}

export function mapFiveDollarResult(raw: FiveDollarFixture): ProviderResult {
  const fixtureId = requireId(raw?.id, "fixture id");
  if (raw.status !== "finished") {
    throw new Error(`5DollarFootballAPI fixture ${fixtureId} is not confirmed finished`);
  }

  const homeGoals = raw.goals?.home;
  const awayGoals = raw.goals?.away;
  if (
    typeof homeGoals !== "number" || !Number.isSafeInteger(homeGoals) || homeGoals < 0 ||
    typeof awayGoals !== "number" || !Number.isSafeInteger(awayGoals) || awayGoals < 0
  ) {
    throw new Error(`5DollarFootballAPI finished fixture ${fixtureId} has incomplete goals`);
  }

  return {
    fixtureExternalId: String(fixtureId),
    homeGoals,
    awayGoals,
    raw
  };
}