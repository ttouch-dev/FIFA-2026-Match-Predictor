import Match from "../models/Match.js";
import { generatePrediction } from "./prediction.service.js";

const API_BASE = "https://api.football-data.org/v4";

const flagMap = {
  MEX: "🇲🇽",
  RSA: "🇿🇦",
  KOR: "🇰🇷",
  CZE: "🇨🇿",
  CAN: "🇨🇦",
  BIH: "🇧🇦",
  QAT: "🇶🇦",
  SUI: "🇨🇭",
  BRA: "🇧🇷",
  MAR: "🇲🇦",
  HAI: "🇭🇹",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA: "🇺🇸",
  PAR: "🇵🇾",
  AUS: "🇦🇺",
  TUR: "🇹🇷",
  GER: "🇩🇪",
  CUW: "🇨🇼",
  CIV: "🇨🇮",
  ECU: "🇪🇨",
  NED: "🇳🇱",
  JPN: "🇯🇵",
  SWE: "🇸🇪",
  TUN: "🇹🇳",
  BEL: "🇧🇪",
  EGY: "🇪🇬",
  IRN: "🇮🇷",
  NZL: "🇳🇿",
  ESP: "🇪🇸",
  CPV: "🇨🇻",
  KSA: "🇸🇦",
  URU: "🇺🇾",
  FRA: "🇫🇷",
  SEN: "🇸🇳",
  IRQ: "🇮🇶",
  NOR: "🇳🇴",
  ARG: "🇦🇷",
  ALG: "🇩🇿",
  AUT: "🇦🇹",
  JOR: "🇯🇴",
  POR: "🇵🇹",
  COD: "🇨🇩",
  UZB: "🇺🇿",
  COL: "🇨🇴",
  ENG: "🏴",
  CRO: "🇭🇷",
  GHA: "🇬🇭",
  PAN: "🇵🇦",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function apiHeaders() {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY,
  };
}

function mapStatus(status) {
  if (status === "FINISHED") return "finished";
  if (["LIVE", "IN_PLAY", "PAUSED"].includes(status)) return "live";
  return "scheduled";
}

function groupName(group) {
  if (!group) return "";
  return group.replace("GROUP_", "Group ");
}

function stageName(stage) {
  if (!stage) return "";
  return stage
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: apiHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Football-data API error ${res.status}: ${text}`);
  }

  return res.json();
}

function defaultStats() {
  return {
    recentPlayed: 0,
    recentWins: 0,
    recentDraws: 0,
    recentLosses: 0,
    record: "0-0-0",
    goalsForAvg: 1,
    goalsAgainstAvg: 1,
    formScore: 50,
    attackScore: 50,
    defenseScore: 50,
    rankScore: 50,
  };
}

function buildTeam(team, oldTeam = null) {
  const stats = oldTeam || defaultStats();

  return {
    ...stats,
    id: team?.id || oldTeam?.id || null,
    name: team?.name || oldTeam?.name || "TBD",
    shortName: team?.shortName || oldTeam?.shortName || "",
    short:
      team?.tla ||
      oldTeam?.short ||
      team?.shortName?.slice(0, 3)?.toUpperCase() ||
      "",
    tla: team?.tla || oldTeam?.tla || "",
    crest: team?.crest || oldTeam?.crest || "",
    flag: flagMap[team?.tla] || oldTeam?.flag || "",
  };
}

function buildFixture(item, oldMatch = null) {
  return {
    externalId: String(item.id),
    tournament: item.competition?.name || "FIFA World Cup",
    group: groupName(item.group),
    stage: stageName(item.stage),
    stadium: item.venue || oldMatch?.stadium || "Stadium",
    city: oldMatch?.city || "",
    country: oldMatch?.country || "",
    kickoff: item.utcDate ? new Date(item.utcDate) : oldMatch?.kickoff,
    status: mapStatus(item.status),

    home: buildTeam(item.homeTeam, oldMatch?.home),
    away: buildTeam(item.awayTeam, oldMatch?.away),

    score: {
      home: item.score?.fullTime?.home ?? oldMatch?.score?.home ?? null,
      away: item.score?.fullTime?.away ?? oldMatch?.score?.away ?? null,
    },

    isPublished: true,
  };
}

function calculateTeamStats(matches) {
  const teamMap = new Map();

  for (const match of matches) {
    if (match.status !== "finished") continue;
    if (!match.home?.tla || !match.away?.tla) continue;

    if (!teamMap.has(match.home.tla)) {
      teamMap.set(match.home.tla, {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      });
    }

    if (!teamMap.has(match.away.tla)) {
      teamMap.set(match.away.tla, {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      });
    }

    const homeStats = teamMap.get(match.home.tla);
    const awayStats = teamMap.get(match.away.tla);

    const homeScore = match.score?.home ?? 0;
    const awayScore = match.score?.away ?? 0;

    homeStats.played++;
    awayStats.played++;

    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;

    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeStats.wins++;
      awayStats.losses++;
    } else if (awayScore > homeScore) {
      awayStats.wins++;
      homeStats.losses++;
    } else {
      homeStats.draws++;
      awayStats.draws++;
    }
  }

  return teamMap;
}

function applyStats(team, teamStats) {
  if (!team?.tla) return team;

  const stats = teamStats.get(team.tla);

  if (!stats || stats.played === 0) return team;

  const goalsForAvg = stats.goalsFor / stats.played;
  const goalsAgainstAvg = stats.goalsAgainst / stats.played;

  const formScore = Math.round(
    ((stats.wins * 3 + stats.draws) / (stats.played * 3)) * 100
  );

  const attackScore = Math.round(clamp(goalsForAvg * 30, 30, 100));
  const defenseScore = Math.round(clamp(100 - goalsAgainstAvg * 25, 20, 100));

  return {
    ...team,
    recentPlayed: stats.played,
    recentWins: stats.wins,
    recentDraws: stats.draws,
    recentLosses: stats.losses,
    record: `${stats.wins}-${stats.draws}-${stats.losses}`,
    goalsForAvg: Number(goalsForAvg.toFixed(2)),
    goalsAgainstAvg: Number(goalsAgainstAvg.toFixed(2)),
    formScore,
    attackScore,
    defenseScore,
  };
}

async function saveApiMatches(apiMatches = []) {
  console.log("Saving matches:", apiMatches.length);

  const builtMatches = [];

  for (const item of apiMatches) {
    const externalId = String(item.id);
    const oldMatch = await Match.findOne({ externalId }).lean();
    const fixture = buildFixture(item, oldMatch);

    builtMatches.push(fixture);
  }

  const teamStats = calculateTeamStats(builtMatches);

  let synced = 0;
  let failed = 0;

  for (const fixture of builtMatches) {
    try {
      fixture.home = applyStats(fixture.home, teamStats);
      fixture.away = applyStats(fixture.away, teamStats);

      const prediction = await generatePrediction(fixture);

      await Match.findOneAndUpdate(
        { externalId: fixture.externalId },
        {
          $set: {
            ...fixture,
            prediction,
            lastSyncedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      synced++;

      console.log(
        `Saved ${synced}:`,
        fixture.externalId,
        fixture.stage,
        fixture.home?.name,
        "vs",
        fixture.away?.name,
        "| Prediction:",
        prediction.result,
        prediction.score,
        "| Model:",
        prediction.modelType
      );
    } catch (error) {
      failed++;
      console.error("Failed to save match:", fixture?.externalId, error.message);
    }
  }

  return {
    synced,
    failed,
  };
}

export async function syncFixtures() {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    throw new Error("FOOTBALL_DATA_API_KEY is missing");
  }

  const url = `${API_BASE}/competitions/WC/matches`;
  const data = await fetchJson(url);

  const result = await saveApiMatches(data.matches || []);

  return {
    ...result,
    source: url,
    totalFromApi: data.resultSet?.count || data.matches?.length || 0,
    playedFromApi: data.resultSet?.played || 0,
    syncedAt: new Date(),
    message: "World Cup matches synced and AI predictions regenerated.",
  };
}