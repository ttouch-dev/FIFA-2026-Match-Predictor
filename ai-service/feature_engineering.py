import math
from typing import Dict, Any, List

TEAM_STRENGTH = {
    "ARG": 92, "BRA": 91, "FRA": 90, "ENG": 89, "ESP": 88, "POR": 87,
    "GER": 86, "NED": 85, "BEL": 83, "CRO": 82, "URU": 81, "COL": 80,
    "USA": 78, "MAR": 78, "SUI": 77, "SEN": 76, "JPN": 76, "MEX": 75,
    "AUS": 73, "ECU": 73, "TUR": 72, "SWE": 72, "CAN": 71, "NOR": 71,
    "CIV": 70, "GHA": 70, "AUT": 70, "PAR": 69, "KOR": 69, "ALG": 69,
    "SCO": 68, "EGY": 68, "BIH": 67, "CPV": 66, "TUN": 66, "RSA": 65,
    "CZE": 65, "IRN": 65, "PAN": 64, "UZB": 64, "COD": 63, "IRQ": 63,
    "JOR": 62, "QAT": 62, "KSA": 62, "HAI": 61, "NZL": 60, "CUW": 59
}

FEATURE_COLUMNS = [
    "home_strength",
    "away_strength",
    "strength_diff",
    "home_form",
    "away_form",
    "form_diff",
    "home_attack",
    "away_attack",
    "attack_diff",
    "home_defense",
    "away_defense",
    "defense_diff",
    "home_goals_for_avg",
    "away_goals_for_avg",
    "home_goals_against_avg",
    "away_goals_against_avg",
    "home_recent_wins",
    "away_recent_wins",
    "home_recent_draws",
    "away_recent_draws",
    "home_recent_losses",
    "away_recent_losses",
    "home_advantage",
    "is_knockout"
]


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def team_code(team: Dict[str, Any]) -> str:
    return (team.get("tla") or team.get("short") or "").upper()


def strength(team: Dict[str, Any]) -> float:
    return float(team.get("rankScore") or TEAM_STRENGTH.get(team_code(team), 50))


def form_score(team: Dict[str, Any]) -> float:
    wins = float(team.get("recentWins") or 0)
    draws = float(team.get("recentDraws") or 0)
    losses = float(team.get("recentLosses") or 0)
    played = wins + draws + losses

    if played <= 0:
        return float(team.get("formScore") or 50)

    return clamp(((wins * 3 + draws) / (played * 3)) * 100, 0, 100)


def attack_score(team: Dict[str, Any]) -> float:
    if team.get("attackScore") is not None:
        return float(team.get("attackScore"))

    gf = float(team.get("goalsForAvg") or 1)
    return clamp(gf * 30, 20, 100)


def defense_score(team: Dict[str, Any]) -> float:
    if team.get("defenseScore") is not None:
        return float(team.get("defenseScore"))

    ga = float(team.get("goalsAgainstAvg") or 1)
    return clamp(100 - ga * 25, 20, 100)


def is_knockout_stage(stage: str) -> int:
    stage = (stage or "").lower()
    knockout_words = ["round", "quarter", "semi", "final", "playoff", "knockout"]
    return 1 if any(word in stage for word in knockout_words) else 0


def build_features(home_team: Dict[str, Any], away_team: Dict[str, Any], stage: str = "") -> List[float]:
    hs = strength(home_team)
    aws = strength(away_team)

    hf = form_score(home_team)
    af = form_score(away_team)

    ha = attack_score(home_team)
    aa = attack_score(away_team)

    hd = defense_score(home_team)
    ad = defense_score(away_team)

    hgf = float(home_team.get("goalsForAvg") or 1)
    agf = float(away_team.get("goalsForAvg") or 1)

    hga = float(home_team.get("goalsAgainstAvg") or 1)
    aga = float(away_team.get("goalsAgainstAvg") or 1)

    hw = float(home_team.get("recentWins") or 0)
    aw = float(away_team.get("recentWins") or 0)

    hdw = float(home_team.get("recentDraws") or 0)
    adw = float(away_team.get("recentDraws") or 0)

    hl = float(home_team.get("recentLosses") or 0)
    al = float(away_team.get("recentLosses") or 0)

    values = [
        hs,
        aws,
        hs - aws,
        hf,
        af,
        hf - af,
        ha,
        aa,
        ha - aa,
        hd,
        ad,
        hd - ad,
        hgf,
        agf,
        hga,
        aga,
        hw,
        aw,
        hdw,
        adw,
        hl,
        al,
        1.0,
        float(is_knockout_stage(stage))
    ]

    return values


def score_from_probabilities(home_win: float, draw: float, away_win: float, home_team: Dict[str, Any], away_team: Dict[str, Any]) -> str:
    hgf = float(home_team.get("goalsForAvg") or 1.2)
    agf = float(away_team.get("goalsForAvg") or 1.0)
    hga = float(home_team.get("goalsAgainstAvg") or 1.0)
    aga = float(away_team.get("goalsAgainstAvg") or 1.0)

    expected_home = (hgf + aga) / 2
    expected_away = (agf + hga) / 2

    if home_win >= draw and home_win >= away_win:
        expected_home += 0.5
    elif away_win >= draw and away_win >= home_win:
        expected_away += 0.5
    else:
        avg = (expected_home + expected_away) / 2
        expected_home = avg
        expected_away = avg

    hg = int(clamp(round(expected_home), 0, 5))
    ag = int(clamp(round(expected_away), 0, 5))

    if home_win > away_win and home_win > draw and hg <= ag:
        hg = ag + 1
    elif away_win > home_win and away_win > draw and ag <= hg:
        ag = hg + 1
    elif draw >= home_win and draw >= away_win:
        ag = hg

    return f"{int(clamp(hg, 0, 5))} - {int(clamp(ag, 0, 5))}"
