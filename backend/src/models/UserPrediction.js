import mongoose from "mongoose";

const userPredictionSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    name: { type: String, default: "Guest" },
    predictedWinner: String,
    predictedScore: String
  },
  { timestamps: true }
);

export default mongoose.model("UserPrediction", userPredictionSchema);
