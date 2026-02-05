import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { User } from "./src/models/User.js";

const createAdminUser = async () => {
  try {
    // Connect to database
    let uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    if (!uri || uri === "your-mongodb-connection-string") {
      uri = "mongodb://localhost:27017/upsc-mentor";
    }

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Find and update the admin user
    const result = await User.findOneAndUpdate(
      { email: "adminai@gmail.com" },
      { role: "admin" },
      { new: true }
    );

    if (result) {
      console.log("✅ Admin user updated successfully:");
      console.log("   Email:", result.email);
      console.log("   Name:", result.name);
      console.log("   Role:", result.role);
    } else {
      console.log("❌ Admin user not found");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

createAdminUser();