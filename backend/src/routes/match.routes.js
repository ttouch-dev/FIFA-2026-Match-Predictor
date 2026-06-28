import express from "express";
import {
  getTodayMatches,
  getUpcomingMatches,
  getHistoryMatches,
  getAiStats,
  getAiStatsMatches,
  getMatchById,
  createUserPrediction,
  regenerateMatchPrediction
} from "../controllers/match.controller.js";

const router = express.Router();

router.get("/today", getTodayMatches);
router.get("/upcoming", getUpcomingMatches);
router.get("/history", getHistoryMatches);
router.get("/ai-stats", getAiStats);
router.get("/ai-stats/matches", getAiStatsMatches);
router.get("/:id", getMatchById);
router.post("/:id/predict", createUserPrediction);
router.post("/:id/regenerate", regenerateMatchPrediction);

export default router;
