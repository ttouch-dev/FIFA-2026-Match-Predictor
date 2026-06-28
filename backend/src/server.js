import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import dns from "dns";
import helmet from "helmet";
import compression from "compression";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import matchRoutes from "./routes/match.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { startDailyFixtureSync } from "./jobs/dailyFixtureSync.job.js";
import { syncFixtures } from "./services/fixtureSync.service.js";

dotenv.config();

console.log("MONGO_URI loaded:", process.env.MONGO_URI ? "YES ✅" : "NO ❌");
console.log("AI_SERVICE_URL loaded:", process.env.AI_SERVICE_URL || "NO ❌");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://172.20.160.1:5173",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const isVercelPreview =
      origin.endsWith(".vercel.app") &&
      origin.includes("worldcup-prediction");

    const isLocalNetwork =
      origin.startsWith("http://172.") ||
      origin.startsWith("http://192.168.") ||
      origin.startsWith("http://10.");

    if (allowedOrigins.includes(origin) || isVercelPreview || isLocalNetwork) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).send("World Cup Prediction backend is running");
});

app.head("/", (req, res) => {
  res.sendStatus(200);
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Server is healthy",
    aiServiceUrl: process.env.AI_SERVICE_URL || null,
    syncStatus: "Initial sync on startup + cron every 6 hours",
  });
});

app.get("/api/dev/sync-fixtures", async (req, res) => {
  try {
    const result = await syncFixtures();

    res.status(200).json({
      success: true,
      message: "Fixtures synced successfully",
      result,
    });
  } catch (error) {
    console.error("Manual sync error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Fixture sync failed",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error",
  });
});

const port = process.env.PORT || 5000;

let fixtureSyncStarted = false;
let initialSyncDone = false;

app.listen(port, "0.0.0.0", async () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`✅ Allowed CLIENT_URL: ${process.env.CLIENT_URL || "Not set"}`);

  try {
    await connectDB(process.env.MONGO_URI);

    if (!initialSyncDone) {
      initialSyncDone = true;

      console.log("🔄 Running initial fixture sync...");

      try {
        const result = await syncFixtures();
        console.log("✅ Initial sync completed:", result);
      } catch (error) {
        console.error("❌ Initial sync failed:", error.message);
      }
    }

    if (!fixtureSyncStarted) {
      startDailyFixtureSync();
      fixtureSyncStarted = true;
      console.log("⏰ Auto sync scheduled every 6 hours");
    }
  } catch (err) {
    console.error("❌ MongoDB connection failed");
    console.error(err.message);
  }
});

process.on("SIGINT", () => {
  console.log("🛑 Server stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Server terminated");
  process.exit(0);
});