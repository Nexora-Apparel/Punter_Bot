import { describe, expect, it } from "vitest";
import { mapFiveDollarFixture, mapFiveDollarResult } from "./mapper";
import type { FiveDollarFixture } from "./mapper";

const fixture: FiveDollarFixture = {
  id: 12345,
  league: { id: 99, name: "Nigeria Premier Football League" },
  teams: {
    home: { id: 1, name: "Rivers United" },
    away: { id: 2, name: "Enyimba" }
  },
  kickoff_utc: "2026-11-22T15:00:00+00:00",
  status: "finished",
  goals: { home: 2, away: 1 }
};

describe("5DollarFootballAPI normalization", () => {
  it("maps provider ids, names, UTC kickoff and season metadata", () => {
    const mapped = mapFiveDollarFixture(fixture, {
      countryCode: "NG",
      currentSeason: "26/27"
    });

    expect(mapped.externalId).toBe("12345");
    expect(mapped.competitionExternalId).toBe("99");
    expect(mapped.season).toBe("26/27");
    expect(mapped.countryCode).toBe("NG");
    expect(mapped.kickoffAt).toBe("2026-11-22T15:00:00.000Z");
  });

  it("marks fixtures without season metadata as unclassified", () => {
    expect(mapFiveDollarFixture(fixture, {}).season).toBe("unclassified");
  });

  it("maps results only when the provider confirms finished status", () => {
    expect(mapFiveDollarResult(fixture)).toMatchObject({
      fixtureExternalId: "12345",
      homeGoals: 2,
      awayGoals: 1
    });
    expect(() => mapFiveDollarResult({ ...fixture, status: "unknown" })).toThrow();
  });

  it("rejects malformed finished scores", () => {
    expect(() => mapFiveDollarResult({
      ...fixture,
      goals: { home: null, away: 1 }
    })).toThrow(/incomplete goals/);
  });
});