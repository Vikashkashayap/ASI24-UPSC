import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.production") });

await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI);
const tests = mongoose.connection.db.collection("tests");

const openWithAnswers = await tests
  .find({
    isSubmitted: { $ne: true },
    "questions.userAnswer": { $in: ["A", "B", "C", "D"] },
  })
  .project({ userId: 1, topic: 1, score: 1, correctAnswers: 1, createdAt: 1 })
  .limit(30)
  .toArray();

console.log("Unsubmitted tests with user answers:", openWithAnswers.length);
for (const t of openWithAnswers.slice(0, 20)) {
  console.log(`- user=${t.userId} topic="${t.topic}" score=${t.score} correct=${t.correctAnswers} at ${t.createdAt}`);
}

const dupSubmittedTopics = await tests
  .aggregate([
    { $match: { isSubmitted: true } },
    {
      $group: {
        _id: { userId: "$userId", topic: "$topic" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ])
  .toArray();

console.log("\nDuplicate submitted same topic:", dupSubmittedTopics.length);
for (const d of dupSubmittedTopics.slice(0, 10)) {
  console.log(`- user=${d._id.userId} topic="${d._id.topic}" count=${d.count}`);
}

await mongoose.disconnect();
