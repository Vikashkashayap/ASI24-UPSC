import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;

    if (!uri) {
      console.error("❌ DATABASE_URL/MONGODB_URI is not defined in environment");
      console.error("⚠️  Server will continue without database connection");
      return;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("⚠️  Server will continue without database connection");
    // Don't exit process - allow server to start without DB for API health checks
  }
};

