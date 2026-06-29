import cron from "node-cron";
import { syncFixtures } from "../services/fixtureSync.service.js";

let isSyncRunning = false;

export function startDailyFixtureSync() {
  cron.schedule("*/15 * * * *", async () => {
    if (isSyncRunning) {
      console.log("⏳ Previous fixture sync is still running. Skipping...");
      return;
    }

    isSyncRunning = true;

    try {
      console.log("🚀 Running scheduled fixture sync...");

      const result = await syncFixtures();

      console.log("✅ Scheduled sync completed:", result);
    } catch (error) {
      console.error("❌ Scheduled sync failed:", error.message);
    } finally {
      isSyncRunning = false;
    }
  });

  console.log("✅ Fixture sync cron registered: every 15 minutes");
}