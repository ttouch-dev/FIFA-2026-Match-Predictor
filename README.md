# World Cup Prediction Real AI Project

This project includes:

- `backend/` Express + MongoDB API
- `ai-service/` FastAPI + XGBoost prediction model
- `frontend/` React/Vite display UI

Important: the AI service includes a training pipeline. You must provide historical football data in:

```txt
ai-service/dataset/international_matches.csv
```

Then run:

```bash
cd ai-service
pip install -r requirements.txt
python train.py
uvicorn app:app --host 0.0.0.0 --port 8000
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
