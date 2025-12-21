import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.DATABASE_URL;

    if (!uri) {
      console.error("❌ DATABASE_URL is not defined in environment");
      process.exit(1);
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

