export type ProviderFixture = {
  externalId: string;
  competitionExternalId: string;
  competitionName: string;
  countryCode?: string;
  season: string;
  homeTeamExternalId: string;
  homeTeamName: string;
  awayTeamExternalId: string;
  awayTeamName: string;
  kickoffAt: string;
  status: string;
  raw: unknown;
};

export type ProviderResult = {
  fixtureExternalId: string;
  homeGoals: number;
  awayGoals: number;
  confirmedAt?: string;
  raw: unknown;
};

export type ProviderPage<T> = {
  records: T[];
  nextCursor?: string;
};

export interface FootballDataProvider {
  readonly code: string;
  readonly displayName: string;
  fetchFixtures(fromUtc: string, toUtc: string): Promise<ProviderPage<ProviderFixture>>;
  fetchResults(fromUtc: string, toUtc: string): Promise<ProviderPage<ProviderResult>>;
}

export type IngestionIssue = {
  sourceCode: string;
  externalId?: string;
  severity: "warning" | "error";
  code: string;
  message: string;
};