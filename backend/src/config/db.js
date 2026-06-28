import mongoose from "mongoose";

export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("❌ MONGO_URI is missing in .env");
  }

  try {
    // Optional: suppress strictQuery warnings
    mongoose.set("strictQuery", true);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      family: 4, // Force IPv4 (helps avoid some DNS/IPv6 issues)
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error("Message:", error.message);
    console.error("Code:", error.code);

    throw error;
  }
}