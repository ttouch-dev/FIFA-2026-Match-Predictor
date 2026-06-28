import os
import joblib
import pandas as pd

from feature_engineering import FEATURE_COLUMNS, build_features, score_from_probabilities

MODEL_PATH = "models/xgboost_match_outcome.pkl"
LABEL_PATH = "models/label_encoder.pkl"


def has_model() -> bool:
    return os.path.exists(MODEL_PATH) and os.path.exists(LABEL_PATH)


def fallback_prediction(home_team, away_team, stage=""):
    features = build_features(home_team, away_team, stage)
    data = dict(zip(FEATURE_COLUMNS, features))

    home_power = (
        data["home_strength"] * 0.45 +
        data["home_form"] * 0.20 +
        data["home_attack"] * 0.15 +
        data["home_defense"] * 0.15 +
        3
    )

    away_power = (
        data["away_strength"] * 0.45 +
        data["away_form"] * 0.20 +
        data["away_attack"] * 0.15 +
        data["away_defense"] * 0.15
    )

    diff = abs(home_power - away_power)
    draw = max(12, min(30, round(28 - diff * 0.35)))
    rest = 100 - draw
    total = home_power + away_power

    home_win = round((home_power / total) * rest)
    away_win = 100 - draw - home_win

    score = score_from_probabilities(home_win, draw, away_win, home_team, away_team)

    if home_win >= draw and home_win >= away_win:
        result = f"{home_team.get('name')} Win"
    elif away_win >= home_win and away_win >= draw:
        result = f"{away_team.get('name')} Win"
    else:
        result = "Draw"

    return {
        "result": result,
        "score": score,
        "homeWin": int(home_win),
        "draw": int(draw),
        "awayWin": int(away_win),
        "confidence": int(max(home_win, draw, away_win)),
        "analysis": f"{home_team.get('name')} vs {away_team.get('name')}: fallback model used because trained XGBoost model was not found.",
        "modelType": "fallback-rule-engine"
    }


def predict_match(home_team, away_team, stage=""):
    if not has_model():
        return fallback_prediction(home_team, away_team, stage)

    model = joblib.load(MODEL_PATH)
    encoder = joblib.load(LABEL_PATH)

    features = build_features(home_team, away_team, stage)
    X = pd.DataFrame([features], columns=FEATURE_COLUMNS)

    probabilities = model.predict_proba(X)[0]
    classes = encoder.inverse_transform(range(len(probabilities)))

    prob_map = {cls: float(probabilities[i]) for i, cls in enumerate(classes)}

    home_win = round(prob_map.get("HOME_WIN", 0) * 100)
    draw = round(prob_map.get("DRAW", 0) * 100)
    away_win = 100 - home_win - draw

    score = score_from_probabilities(home_win, draw, away_win, home_team, away_team)

    if home_win >= draw and home_win >= away_win:
        result = f"{home_team.get('name')} Win"
    elif away_win >= home_win and away_win >= draw:
        result = f"{away_team.get('name')} Win"
    else:
        result = "Draw"

    confidence = max(home_win, draw, away_win)

    return {
        "result": result,
        "score": score,
        "homeWin": int(home_win),
        "draw": int(draw),
        "awayWin": int(away_win),
        "confidence": int(confidence),
        "analysis": f"{home_team.get('name')} vs {away_team.get('name')}: XGBoost model used team strength, form, attack, defense, goals averages and match stage.",
        "modelType": "xgboost"
    }
