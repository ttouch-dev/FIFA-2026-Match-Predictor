import dayjs from "dayjs";
import Match from "../models/Match.js";
import { generatePrediction } from "../services/prediction.service.js";

function success(res, data, message = "Success") {
  return res.status(200).json({ success: true, message, data });
}

function serverError(res, error) {
  console.error("Controller Error:", error);
  return res.status(500).json({
    success: false,
    message: error.message || "Server error",
  });
}

function matchQuery(id) {
  return {
    $or: [
      { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      { externalId: id },
    ],
  };
}

function validMatchQuery(extra = {}) {
  return {
    ...extra,
    isPublished: true,
    home: { $ne: null },
    away: { $ne: null },
    "home.name": { $exists: true, $ne: null },
    "away.name": { $exists: true, $ne: null },
  };
}

export async function getTodayMatches(req, res) {
  try {
    const start = dayjs().startOf("day").toDate();
    const end = dayjs().endOf("day").toDate();

    const matches = await Match.find(
      validMatchQuery({
        kickoff: { $gte: start, $lte: end },
      })
    )
      .sort({ kickoff: 1 })
      .lean();

    return success(res, matches);
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getUpcomingMatches(req, res) {
  try {
    const matches = await Match.find(
      validMatchQuery({
        kickoff: { $gte: new Date() },
        status: { $ne: "finished" },
      })
    )
      .sort({ kickoff: 1 })
      .lean();

    return success(res, matches);
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getHistoryMatches(req, res) {
  try {
    const matches = await Match.find(
      validMatchQuery({
        status: "finished",
      })
    )
      .sort({ kickoff: -1 })
      .lean();

    return success(res, matches);
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getMatchById(req, res) {
  try {
    const match = await Match.findOne(matchQuery(req.params.id)).lean();

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    return success(res, match);
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getAiStats(req, res) {
  try {
    const totalMatches = await Match.countDocuments({ isPublished: true });

    const predictedMatches = await Match.countDocuments({
      isPublished: true,
      prediction: { $exists: true },
    });

    const xgboostPredictions = await Match.countDocuments({
      isPublished: true,
      "prediction.modelType": "xgboost",
    });

    const fallbackPredictions = await Match.countDocuments({
      isPublished: true,
      "prediction.modelType": { $exists: true, $ne: "xgboost" },
    });

    const finishedMatches = await Match.countDocuments({
      isPublished: true,
      status: "finished",
    });

    const upcomingMatches = await Match.countDocuments({
      isPublished: true,
      status: { $in: ["scheduled", "live"] },
    });

    return success(res, {
      totalMatches,
      predictedMatches,
      xgboostPredictions,
      fallbackPredictions,
      finishedMatches,
      upcomingMatches,
    });
  } catch (error) {
    return serverError(res, error);
  }
}

export async function getAiStatsMatches(req, res) {
  try {
    const matches = await Match.find(
      validMatchQuery({
        prediction: { $exists: true },
      })
    )
      .sort({ kickoff: 1 })
      .select("externalId home away kickoff stage group status score prediction")
      .lean();

    return success(res, matches);
  } catch (error) {
    return serverError(res, error);
  }
}

export async function createUserPrediction(req, res) {
  try {
    const { name, predictedWinner, predictedScore } = req.body;

    const match = await Match.findOne(matchQuery(req.params.id));

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    match.userPredictions.push({
      name: name || "Guest",
      predictedWinner,
      predictedScore,
    });

    await match.save();

    return res.status(201).json({
      success: true,
      message: "Prediction submitted successfully",
      data: match,
    });
  } catch (error) {
    return serverError(res, error);
  }
}

export async function regenerateMatchPrediction(req, res) {
  try {
    const match = await Match.findOne(matchQuery(req.params.id));

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    match.prediction = await generatePrediction(match);
    await match.save();

    return success(res, match, "AI prediction regenerated");
  } catch (error) {
    return serverError(res, error);
  }
}