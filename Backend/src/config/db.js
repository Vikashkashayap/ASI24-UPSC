import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error", error.message);
    process.exit(1);
  }
};
