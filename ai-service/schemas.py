from typing import Optional
from pydantic import BaseModel


class TeamInput(BaseModel):
    name: str
    shortName: Optional[str] = None
    short: Optional[str] = None
    tla: Optional[str] = None
    rankScore: Optional[float] = None
    formScore: Optional[float] = None
    attackScore: Optional[float] = None
    defenseScore: Optional[float] = None
    recentPlayed: Optional[int] = 0
    recentWins: Optional[int] = 0
    recentDraws: Optional[int] = 0
    recentLosses: Optional[int] = 0
    goalsForAvg: Optional[float] = 1
    goalsAgainstAvg: Optional[float] = 1


class PredictionRequest(BaseModel):
    homeTeam: TeamInput
    awayTeam: TeamInput
    stage: Optional[str] = ""
    matchId: Optional[str] = None


class PredictionResponse(BaseModel):
    result: str
    score: str
    homeWin: int
    draw: int
    awayWin: int
    confidence: int
    analysis: str
    modelType: str
