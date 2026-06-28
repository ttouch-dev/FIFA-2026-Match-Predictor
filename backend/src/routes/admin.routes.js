import express from "express";
import {
  adminStats,
  adminSyncFixtures,
  regenerateAllPredictions
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/stats", requireAuth, adminStats);
router.post("/sync-fixtures", requireAuth, adminSyncFixtures);
router.post("/regenerate-predictions", requireAuth, regenerateAllPredictions);

export default router;
