import type {
  FootballDataProvider,
  ProviderFixture,
  ProviderPage,
  ProviderResult
} from "../contracts";
import { FiveDollarClient } from "./client";
import {
  mapFiveDollarFixture,
  mapFiveDollarResult,
  type FiveDollarFixture,
  type FiveDollarLeagueMetadata
} from "./mapper";

type FiveDollarLeague = {
  id: number;
  name: string;
  country?: { code?: string; name?: string };
  seasons?: Array<{ season: string; current: boolean }>;
};

type AccountStatus = {
  plan: string;
  limits?: {
    rate_limit?: number;
    rate_window_seconds?: number;
    burst_per_minute?: number | null;
  };
  usage?: { today?: number };
};

function toUnixSeconds(value: string, field: string): number {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${field} must be a valid ISO timestamp`);
  return Math.floor(milliseconds / 1000);
}

function validateWindow(fromUtc: string, toUtc: string): { start: number; end: number } {
  const start = toUnixSeconds(fromUtc, "fromUtc");
  const end = toUnixSeconds(toUtc, "toUtc");
  if (end <= start) throw new RangeError("toUtc must be later than fromUtc");
  if (end - start > 86_400) {
    throw new RangeError("GET /fixtures accepts a maximum 24-hour time window");
  }
  return { start, end };
}

export class FiveDollarFootballProvider implements FootballDataProvider {
  private lastNotices: string[] = [];
  readonly code = "five_dollar_football_api";
  readonly displayName = "5DollarFootballAPI";
  private readonly client: FiveDollarClient;

  constructor(client = new FiveDollarClient()) {
    this.client = client;
  }

  async getAccountStatus(): Promise<AccountStatus> {
    const result = await this.client.get<AccountStatus>("status");
    return result.data;
  }

  getLastNotices(): string[] {
    return [...this.lastNotices];
  }

  async listLeagues(countryCode?: string): Promise<FiveDollarLeague[]> {
    const result = await this.client.getAllPages<FiveDollarLeague>("leagues", {
      country: countryCode,
      include: "seasons",
      per_page: 100
    });
    this.lastNotices = result.notices.map((notice) => notice.message ?? notice.code ?? "Provider notice");
    return result.records;
  }

  async verifyCommunityCountryPack(countryCode: string): Promise<{
    plan: string;
    leagues: FiveDollarLeague[];
  }> {
    const account = await this.getAccountStatus();
    if (!account.plan.toLowerCase().includes("community")) {
      throw new Error(`Expected Community Access; API reports plan "${account.plan}"`);
    }
    const leagues = await this.listLeagues(countryCode);
    if (leagues.length === 0) {
      throw new Error(`No competitions returned for country pack ${countryCode}`);
    }
    return { plan: account.plan, leagues };
  }

  async fetchFixtures(fromUtc: string, toUtc: string): Promise<ProviderPage<ProviderFixture>> {
    const window = validateWindow(fromUtc, toUtc);
    const [leagueResult, fixtureRecords] = await Promise.all([
      this.client.getAllPages<FiveDollarLeague>("leagues", { include: "seasons", per_page: 100 }),
      this.client.getAllPages<FiveDollarFixture>("fixtures", {
        start_time: window.start,
        end_time: window.end,
        status: "all",
        per_page: 100
      })
    ]);

    this.lastNotices = [...leagueResult.notices, ...fixtureRecords.notices]
      .map((notice) => notice.message ?? notice.code ?? "Provider notice");
    const metadata = this.buildLeagueMetadata(leagueResult.records);
    const records = fixtureRecords.records.map((fixture) =>
      mapFiveDollarFixture(fixture, metadata.get(String(fixture.league?.id)) ?? {})
    );

    return { records, nextCursor: undefined };
  }

  async fetchLeagueFixtures(
    leagueId: number,
    options: { season?: string; status?: "all" | "scheduled" | "live" | "finished" | "unknown" } = {}
  ): Promise<ProviderPage<ProviderFixture>> {
    if (!Number.isSafeInteger(leagueId) || leagueId <= 0) {
      throw new RangeError("leagueId must be a positive integer");
    }
    const leagueRecords = await this.listLeagues();
    const league = leagueRecords.find((record) => record.id === leagueId);
    if (!league) {
      throw new Error(`League ${leagueId} is not present in the current account's accessible league catalogue`);
    }

    const result = await this.client.getAllPages<FiveDollarFixture>(`leagues/${leagueId}/fixtures`, {
      season: options.season,
      status: options.status ?? "all",
      order: "asc",
      per_page: 100
    });
    this.lastNotices = result.notices.map((notice) => notice.message ?? notice.code ?? "Provider notice");
    const metadata = this.buildLeagueMetadata([league]);
    if (options.season) metadata.set(String(leagueId), {
      countryCode: league.country?.code,
      currentSeason: options.season
    });

    return {
      records: result.records.map((fixture) =>
        mapFiveDollarFixture(fixture, metadata.get(String(fixture.league?.id)) ?? {})
      ),
      nextCursor: undefined
    };
  }

  async fetchResults(fromUtc: string, toUtc: string): Promise<ProviderPage<ProviderResult>> {
    const window = validateWindow(fromUtc, toUtc);
    const result = await this.client.getAllPages<FiveDollarFixture>("fixtures", {
      start_time: window.start,
      end_time: window.end,
      status: "finished",
      per_page: 100
    });

    return {
      records: result.records.map(mapFiveDollarResult),
      nextCursor: undefined
    };
  }

  private buildLeagueMetadata(leagues: FiveDollarLeague[]): Map<string, FiveDollarLeagueMetadata> {
    const metadata = new Map<string, FiveDollarLeagueMetadata>();
    for (const league of leagues) {
      const currentSeason = league.seasons?.find((season) => season.current)?.season;
      metadata.set(String(league.id), {
        countryCode: league.country?.code,
        currentSeason
      });
    }
    return metadata;
  }
}