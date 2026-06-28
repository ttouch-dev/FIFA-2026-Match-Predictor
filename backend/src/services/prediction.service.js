import axios from "axios";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const strength = {
  ARG: 92, BRA: 91, FRA: 90, ENG: 89, ESP: 88, POR: 87,
  GER: 86, NED: 85, BEL: 83, CRO: 82, URU: 81, COL: 80,
  USA: 78, MAR: 78, SUI: 77, SEN: 76, JPN: 76, MEX: 75,
  AUS: 73, ECU: 73, TUR: 72, SWE: 72, CAN: 71, NOR: 71,
  CIV: 70, GHA: 70, AUT: 70, PAR: 69, KOR: 69, ALG: 69,
  SCO: 68, EGY: 68, BIH: 67, CPV: 66, TUN: 66, RSA: 65,
  CZE: 65, IRN: 65, PAN: 64, UZB: 64, COD: 63, IRQ: 63,
  JOR: 62, QAT: 62, KSA: 62, HAI: 61, NZL: 60, CUW: 59
};

function getCode(team) {
  return team?.tla || team?.short || "";
}

function getBaseStrength(team) {
  return strength[getCode(team)] || 50;
}

function getTeamPower(team, isHome = false) {
  const base = getBaseStrength(team);
  const form = team?.formScore || 50;
  const attack = team?.attackScore || 50;
  const defense = team?.defenseScore || 50;
  const goalsFor = team?.goalsForAvg || 1;
  const goalsAgainst = team?.goalsAgainstAvg || 1;

  let power =
    base * 0.45 +
    form * 0.20 +
    attack * 0.15 +
    defense * 0.15 +
    goalsFor * 3 -
    goalsAgainst * 2;

  if (isHome) power += 3;

  return clamp(power, 20, 100);
}

function normalizePercent(homePower, awayPower) {
  const diff = Math.abs(homePower - awayPower);
  const draw = clamp(Math.round(28 - diff * 0.35), 12, 30);
  const rest = 100 - draw;
  const total = homePower + awayPower || 1;

  const homeWin = Math.round((homePower / total) * rest);
  const awayWin = 100 - draw - homeWin;

  return {
    homeWin: clamp(homeWin, 1, 99),
    draw: clamp(draw, 1, 99),
    awayWin: clamp(awayWin, 1, 99)
  };
}

function predictScore(homePower, awayPower, homeWin, draw, awayWin) {
  const diff = homePower - awayPower;

  if (draw >= homeWin && draw >= awayWin) {
    return { homeGoals: 1, awayGoals: 1 };
  }

  let homeGoals = 1;
  let awayGoals = 1;

  if (diff > 22) [homeGoals, awayGoals] = [3, 0];
  else if (diff > 14) [homeGoals, awayGoals] = [3, 1];
  else if (diff > 6) [homeGoals, awayGoals] = [2, 1];
  else if (diff > 2) [homeGoals, awayGoals] = [1, 0];
  else if (diff < -22) [homeGoals, awayGoals] = [0, 3];
  else if (diff < -14) [homeGoals, awayGoals] = [1, 3];
  else if (diff < -6) [homeGoals, awayGoals] = [1, 2];
  else if (diff < -2) [homeGoals, awayGoals] = [0, 1];

  return {
    homeGoals: clamp(homeGoals, 0, 5),
    awayGoals: clamp(awayGoals, 0, 5)
  };
}

export function generateRulePrediction(match) {
  const home = match.home || {};
  const away = match.away || {};

  if (!home.name || !away.name || home.name === "TBD" || away.name === "TBD") {
    return {
      result: "TBD",
      score: "TBD",
      homeWin: 0,
      draw: 0,
      awayWin: 0,
      confidence: 0,
      analysis: "Prediction will be generated after both teams are confirmed.",
      modelType: "tbd"
    };
  }

  const homePower = getTeamPower(home, true);
  const awayPower = getTeamPower(away, false);
  const { homeWin, draw, awayWin } = normalizePercent(homePower, awayPower);
  const { homeGoals, awayGoals } = predictScore(homePower, awayPower, homeWin, draw, awayWin);

  let result = "Draw";
  if (homeGoals > awayGoals) result = `${home.name} Win`;
  if (awayGoals > homeGoals) result = `${away.name} Win`;

  return {
    result,
    score: `${homeGoals} - ${awayGoals}`,
    homeWin,
    draw,
    awayWin,
    confidence: Math.max(homeWin, draw, awayWin),
    analysis: `${home.name} vs ${away.name}: rule fallback used team strength, form, attack, defense and goals average.`,
    modelType: "node-rule-fallback"
  };
}

export async function generatePrediction(match) {
  const home = match.home || {};
  const away = match.away || {};

  if (!home.name || !away.name || home.name === "TBD" || away.name === "TBD") {
    return generateRulePrediction(match);
  }

  const aiUrl = process.env.AI_SERVICE_URL;

  if (!aiUrl) {
    return generateRulePrediction(match);
  }

  try {
    const { data } = await axios.post(
      `${aiUrl}/predict`,
      {
        matchId: match.externalId,
        homeTeam: home,
        awayTeam: away,
        stage: match.stage || ""
      },
      { timeout: 5000 }
    );

    return {
      result: data.result,
      score: data.score,
      homeWin: data.homeWin,
      draw: data.draw,
      awayWin: data.awayWin,
      confidence: data.confidence,
      analysis: data.analysis,
      modelType: data.modelType || "xgboost"
    };
  } catch (error) {
    console.error("AI service failed, using fallback:", error.message);
    return generateRulePrediction(match);
  }
}
