import cron from "node-cron";
import { syncFixtures } from "../services/fixtureSync.service.js";

export function startDailyFixtureSync() {
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("Running scheduled fixture sync...");

      const result = await syncFixtures();

      console.log("Scheduled sync completed:", result);
    } catch (error) {
      console.error("Scheduled sync failed:", error.message);
    }
  });

  console.log("✅ Fixture sync cron registered: every 6 hours");
}