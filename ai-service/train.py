import os
import joblib
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from feature_engineering import FEATURE_COLUMNS, TEAM_STRENGTH

DATASET_PATH = "dataset/international_matches.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_match_outcome.pkl")
LABEL_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")


def get_tla_from_name(name: str) -> str:
    name = str(name or "").strip().lower()
    aliases = {
        "argentina": "ARG",
        "brazil": "BRA",
        "france": "FRA",
        "england": "ENG",
        "spain": "ESP",
        "portugal": "POR",
        "germany": "GER",
        "netherlands": "NED",
        "belgium": "BEL",
        "croatia": "CRO",
        "uruguay": "URU",
        "colombia": "COL",
        "united states": "USA",
        "usa": "USA",
        "morocco": "MAR",
        "switzerland": "SUI",
        "senegal": "SEN",
        "japan": "JPN",
        "mexico": "MEX",
        "australia": "AUS",
        "ecuador": "ECU",
        "turkey": "TUR",
        "sweden": "SWE",
        "canada": "CAN",
        "norway": "NOR",
        "ivory coast": "CIV",
        "ghana": "GHA",
        "austria": "AUT",
        "paraguay": "PAR",
        "south korea": "KOR",
        "korea republic": "KOR",
        "algeria": "ALG",
        "scotland": "SCO",
        "egypt": "EGY",
        "bosnia-herzegovina": "BIH",
        "bosnia and herzegovina": "BIH",
        "cape verde": "CPV",
        "tunisia": "TUN",
        "south africa": "RSA",
        "czechia": "CZE",
        "iran": "IRN",
        "panama": "PAN",
        "uzbekistan": "UZB",
        "congo dr": "COD",
        "dr congo": "COD",
        "iraq": "IRQ",
        "jordan": "JOR",
        "qatar": "QAT",
        "saudi arabia": "KSA",
        "haiti": "HAI",
        "new zealand": "NZL",
        "curaçao": "CUW",
        "curacao": "CUW"
    }
    return aliases.get(name, name[:3].upper())


def outcome(row):
    if row["home_score"] > row["away_score"]:
        return "HOME_WIN"
    if row["home_score"] < row["away_score"]:
        return "AWAY_WIN"
    return "DRAW"


def create_team_stats(df):
    stats = {}

    def ensure(team):
        if team not in stats:
            stats[team] = {
                "played": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
                "goals_for": 0,
                "goals_against": 0
            }

    for _, row in df.iterrows():
        home = row["home_team"]
        away = row["away_team"]
        hs = int(row["home_score"])
        aws = int(row["away_score"])

        ensure(home)
        ensure(away)

        stats[home]["played"] += 1
        stats[away]["played"] += 1

        stats[home]["goals_for"] += hs
        stats[home]["goals_against"] += aws
        stats[away]["goals_for"] += aws
        stats[away]["goals_against"] += hs

        if hs > aws:
            stats[home]["wins"] += 1
            stats[away]["losses"] += 1
        elif aws > hs:
            stats[away]["wins"] += 1
            stats[home]["losses"] += 1
        else:
            stats[home]["draws"] += 1
            stats[away]["draws"] += 1

    return stats


def team_object(name, stats):
    tla = get_tla_from_name(name)
    item = stats.get(name, {})
    played = max(item.get("played", 0), 1)

    goals_for_avg = item.get("goals_for", 0) / played
    goals_against_avg = item.get("goals_against", 0) / played
    wins = item.get("wins", 0)
    draws = item.get("draws", 0)
    losses = item.get("losses", 0)

    form_score = ((wins * 3 + draws) / (played * 3)) * 100
    attack_score = max(20, min(100, goals_for_avg * 30))
    defense_score = max(20, min(100, 100 - goals_against_avg * 25))

    return {
        "name": name,
        "tla": tla,
        "rankScore": TEAM_STRENGTH.get(tla, 50),
        "formScore": form_score,
        "attackScore": attack_score,
        "defenseScore": defense_score,
        "recentWins": wins,
        "recentDraws": draws,
        "recentLosses": losses,
        "goalsForAvg": goals_for_avg,
        "goalsAgainstAvg": goals_against_avg
    }


def build_features_for_training(home_team, away_team, stage, stats):
    from feature_engineering import build_features
    return build_features(team_object(home_team, stats), team_object(away_team, stats), stage)


def train():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"Dataset missing: {DATASET_PATH}. Add international_matches.csv first."
        )

    df = pd.read_csv(DATASET_PATH)
    required = ["date", "home_team", "away_team", "home_score", "away_score", "tournament"]

    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing dataset column: {col}")

    df = df.dropna(subset=["home_team", "away_team", "home_score", "away_score"])
    df["home_score"] = df["home_score"].astype(int)
    df["away_score"] = df["away_score"].astype(int)
    df["outcome"] = df.apply(outcome, axis=1)

    stats = create_team_stats(df)

    X = []
    y = []

    for _, row in df.iterrows():
        X.append(build_features_for_training(
            row["home_team"],
            row["away_team"],
            row.get("tournament", ""),
            stats
        ))
        y.append(row["outcome"])

    X = pd.DataFrame(X, columns=FEATURE_COLUMNS)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded
    )

    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=42
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    acc = accuracy_score(y_test, predictions)

    print("Accuracy:", round(acc, 4))
    print(classification_report(y_test, predictions, target_names=encoder.classes_))

    os.makedirs(MODEL_DIR, exist_ok=True)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, LABEL_PATH)

    print("Saved:", MODEL_PATH)
    print("Saved:", LABEL_PATH)


if __name__ == "__main__":
    train()
