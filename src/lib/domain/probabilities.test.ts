import { describe, expect, it } from "vitest";
import {
  buildScorelineMatrix,
  deriveMarketProbabilities,
  poissonProbability
} from "./probabilities";

describe("Poisson probability foundation", () => {
  it("returns the correct zero-rate distribution", () => {
    expect(poissonProbability(0, 0)).toBe(1);
    expect(poissonProbability(0, 1)).toBe(0);
  });

  it("rejects invalid expected-goal inputs", () => {
    expect(() => poissonProbability(-0.1, 1)).toThrow(RangeError);
    expect(() => poissonProbability(1.2, -1)).toThrow(RangeError);
  });

  it("normalizes the truncated scoreline matrix", () => {
    const matrix = buildScorelineMatrix(1.35, 0.95);
    const total = matrix.reduce((sum, score) => sum + score.probability, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("derives complementary market probabilities", () => {
    const markets = deriveMarketProbabilities(buildScorelineMatrix(1.4, 1.1));
    expect(markets.homeWin + markets.draw + markets.awayWin).toBeCloseTo(1, 10);
    expect(markets.bttsYes + markets.bttsNo).toBeCloseTo(1, 10);
    expect(markets.over15 + markets.under15).toBeCloseTo(1, 10);
    expect(markets.over25 + markets.under25).toBeCloseTo(1, 10);
  });
});