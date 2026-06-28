from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas import PredictionRequest, PredictionResponse
from predict import predict_match, has_model

app = FastAPI(title="World Cup Prediction AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "ok": True,
        "service": "World Cup Prediction AI Service",
        "model_loaded": has_model()
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_loaded": has_model()
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest):
    return predict_match(
        payload.homeTeam.model_dump(),
        payload.awayTeam.model_dump(),
        payload.stage or ""
    )
