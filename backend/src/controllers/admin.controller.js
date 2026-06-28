import Match from "../models/Match.js";
import { syncFixtures } from "../services/fixtureSync.service.js";
import { generatePrediction } from "../services/prediction.service.js";

export async function adminStats(req, res) {
  try {
    const totalMatches = await Match.countDocuments();
    const finishedMatches = await Match.countDocuments({ status: "finished" });
    const scheduledMatches = await Match.countDocuments({ status: "scheduled" });
    const xgboostPredictions = await Match.countDocuments({ "prediction.modelType": "xgboost" });

    res.json({
      success: true,
      data: { totalMatches, finishedMatches, scheduledMatches, xgboostPredictions }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function adminSyncFixtures(req, res) {
  try {
    const result = await syncFixtures();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function regenerateAllPredictions(req, res) {
  try {
    const matches = await Match.find({});
    let count = 0;

    for (const match of matches) {
      match.prediction = await generatePrediction(match);
      await match.save();
      count++;
    }

    res.json({
      success: true,
      message: "All AI predictions regenerated",
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
