import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import { connectDB } from "./config/db.js";

dotenv.config();

async function seed() {
  await connectDB(process.env.MONGO_URI);

  const email = "admin@worldcup.com";
  const password = "admin12345";

  const exists = await User.findOne({ email });

  if (!exists) {
    await User.create({
      name: "Admin",
      email,
      password: await bcrypt.hash(password, 10),
      role: "ADMIN"
    });
  }

  console.log("✅ Admin user ready");
  console.log("Email:", email);
  console.log("Password:", password);

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
