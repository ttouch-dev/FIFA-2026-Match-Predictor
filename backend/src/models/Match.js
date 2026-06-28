import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    id: Number,
    name: String,
    shortName: String,
    short: String,
    tla: String,
    crest: String,
    flag: String,

    record: {
      type: String,
      default: "0-0-0",
    },

    rankScore: {
      type: Number,
      default: 50,
    },

    formScore: {
      type: Number,
      default: 50,
    },

    attackScore: {
      type: Number,
      default: 50,
    },

    defenseScore: {
      type: Number,
      default: 50,
    },

    recentPlayed: {
      type: Number,
      default: 0,
    },

    recentWins: {
      type: Number,
      default: 0,
    },

    recentDraws: {
      type: Number,
      default: 0,
    },

    recentLosses: {
      type: Number,
      default: 0,
    },

    goalsForAvg: {
      type: Number,
      default: 0,
    },

    goalsAgainstAvg: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const predictionSchema = new mongoose.Schema(
  {
    result: String,
    score: String,
    homeWin: Number,
    draw: Number,
    awayWin: Number,
    confidence: Number,
    analysis: String,

    modelType: {
      type: String,
      default: "unknown",
    },
  },
  {
    _id: false,
  }
);

const userPredictionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Guest",
    },

    predictedWinner: String,
    predictedScore: String,

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const matchSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      index: true,
      unique: true,
      required: true,
    },

    tournament: {
      type: String,
      default: "FIFA World Cup",
    },

    group: String,
    stage: String,
    stadium: String,
    city: String,
    country: String,
    kickoff: Date,

    status: {
      type: String,
      enum: ["scheduled", "live", "finished"],
      default: "scheduled",
    },

    home: teamSchema,
    away: teamSchema,

    score: {
      home: {
        type: Number,
        default: null,
      },

      away: {
        type: Number,
        default: null,
      },
    },

    prediction: predictionSchema,
    userPredictions: [userPredictionSchema],

    isPublished: {
      type: Boolean,
      default: true,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Match", matchSchema);