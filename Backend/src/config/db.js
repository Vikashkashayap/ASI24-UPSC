import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    let uri = process.env.DATABASE_URL || process.env.MONGODB_URI;

    // If no URI is provided or it's the placeholder, use local MongoDB
    if (!uri || uri === "your-mongodb-connection-string") {
      uri = "mongodb://localhost:27017/upsc-mentor";
      console.log("🔧 Using default local MongoDB connection:", uri);
    }

    // Validate the connection string format
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      console.error("❌ Invalid MongoDB connection string format:", uri);
      console.error("⚠️  Expected format: mongodb://localhost:27017/database or mongodb+srv://...");
      console.error("⚠️  Server will continue without database connection");
      return;
    }

    console.log("🔗 Attempting to connect to MongoDB...");
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);

    // Provide helpful troubleshooting information
    if (error.message.includes('ECONNREFUSED')) {
      console.error("💡 Troubleshooting: Make sure MongoDB is running locally");
      console.error("   - Start MongoDB service: net start MongoDB");
      console.error("   - Or install/start MongoDB if not installed");
    } else if (error.message.includes('authentication failed')) {
      console.error("💡 Troubleshooting: Check your MongoDB credentials");
    }

    console.error("⚠️  Server will continue without database connection");
    // Don't exit process - allow server to start without DB for API health checks
  }
};

