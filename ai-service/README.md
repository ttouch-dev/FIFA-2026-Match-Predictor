# AI Service

## Dataset format

Create:

```txt
ai-service/dataset/international_matches.csv
```

Required columns:

```csv
date,home_team,away_team,home_score,away_score,tournament,city,country,neutral
```

Example:

```csv
2022-12-18,Argentina,France,3,3,FIFA World Cup,Lusail,Qatar,TRUE
```

## Train

```bash
pip install -r requirements.txt
python train.py
```

## Run API

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Test

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"homeTeam":{"name":"Brazil","tla":"BRA","recentWins":2,"recentDraws":1,"recentLosses":0,"goalsForAvg":2.0,"goalsAgainstAvg":0.7},"awayTeam":{"name":"Japan","tla":"JPN","recentWins":1,"recentDraws":1,"recentLosses":1,"goalsForAvg":1.4,"goalsAgainstAvg":1.0},"stage":"Round Of 32"}'
```
