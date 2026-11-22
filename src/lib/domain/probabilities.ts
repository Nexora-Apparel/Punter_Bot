export type Scoreline = {
  homeGoals: number;
  awayGoals: number;
  probability: number;
};

export type MarketProbabilities = {
  homeWin: number;
  draw: number;
  awayWin: number;
  bttsYes: number;
  bttsNo: number;
  over15: number;
  under15: number;
  over25: number;
  under25: number;
};

function logFactorial(value: number): number {
  let total = 0;
  for (let i = 2; i <= value; i += 1) total += Math.log(i);
  return total;
}

export function poissonProbability(lambda: number, goals: number): number {
  if (!Number.isFinite(lambda) || lambda < 0) {
    throw new RangeError("lambda must be a finite non-negative number");
  }
  if (!Number.isInteger(goals) || goals < 0) {
    throw new RangeError("goals must be a non-negative integer");
  }
  if (lambda === 0) return goals === 0 ? 1 : 0;
  return Math.exp(-lambda + goals * Math.log(lambda) - logFactorial(goals));
}

export function buildScorelineMatrix(
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  maxGoals = 10
): Scoreline[] {
  if (!Number.isInteger(maxGoals) || maxGoals < 1 || maxGoals > 20) {
    throw new RangeError("maxGoals must be an integer between 1 and 20");
  }

  const raw: Scoreline[] = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      raw.push({
        homeGoals: home,
        awayGoals: away,
        probability:
          poissonProbability(homeExpectedGoals, home) *
          poissonProbability(awayExpectedGoals, away)
      });
    }
  }

  const total = raw.reduce((sum, score) => sum + score.probability, 0);
  if (!Number.isFinite(total) || total <= 0) {
    throw new RangeError("scoreline distribution could not be normalized");
  }
  return raw.map((score) => ({ ...score, probability: score.probability / total }));
}

export function deriveMarketProbabilities(matrix: Scoreline[]): MarketProbabilities {
  if (matrix.length === 0) throw new RangeError("scoreline matrix cannot be empty");
  const total = matrix.reduce((sum, score) => sum + score.probability, 0);
  if (Math.abs(total - 1) > 1e-8) {
    throw new RangeError("scoreline probabilities must sum to 1");
  }

  const homeWin = matrix.filter((s) => s.homeGoals > s.awayGoals).reduce((sum, s) => sum + s.probability, 0);
  const draw = matrix.filter((s) => s.homeGoals === s.awayGoals).reduce((sum, s) => sum + s.probability, 0);
  const awayWin = matrix.filter((s) => s.homeGoals < s.awayGoals).reduce((sum, s) => sum + s.probability, 0);
  const bttsYes = matrix.filter((s) => s.homeGoals > 0 && s.awayGoals > 0).reduce((sum, s) => sum + s.probability, 0);
  const over15 = matrix.filter((s) => s.homeGoals + s.awayGoals >= 2).reduce((sum, s) => sum + s.probability, 0);
  const over25 = matrix.filter((s) => s.homeGoals + s.awayGoals >= 3).reduce((sum, s) => sum + s.probability, 0);

  return {
    homeWin, draw, awayWin,
    bttsYes, bttsNo: 1 - bttsYes,
    over15, under15: 1 - over15,
    over25, under25: 1 - over25
  };
}