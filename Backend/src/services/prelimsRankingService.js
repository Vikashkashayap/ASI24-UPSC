import mongoose from "mongoose";
import PrelimsTestAttempt from "../models/PrelimsTestAttempt.js";

/** Chunk size for bulk rank updates (10k+ scalability) */
const BULK_CHUNK_SIZE = 1000;

/**
 * Recalculate ranks for a test: highest score first, then faster time taken.
 * Uses cursor + bulkWrite in chunks for 10,000+ students scalability.
 */
export async function recalculateRanksForTest(testId) {
  const cursor = PrelimsTestAttempt.find({ testId })
    .sort({ score: -1, timeTaken: 1, submittedAt: 1 })
    .select("_id")
    .lean()
    .cursor();

  let index = 0;
  let bulkOps = [];

  for await (const doc of cursor) {
    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { rank: index + 1 } },
      },
    });
    index++;
    if (bulkOps.length >= BULK_CHUNK_SIZE) {
      await PrelimsTestAttempt.bulkWrite(bulkOps);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    await PrelimsTestAttempt.bulkWrite(bulkOps);
  }
}

/**
 * Get rank list for a test (top N).
 * Uses aggregation for efficient sorting with 10k+ attempts.
 */
export async function getRankList(testId, limit = 50) {
  const id = typeof testId === "string" ? new mongoose.Types.ObjectId(testId) : testId;
  const pipeline = [
    { $match: { testId: id } },
    { $sort: { score: -1, timeTaken: 1, submittedAt: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: "$userId",
        name: { $ifNull: ["$user.name", "Unknown"] },
        email: { $ifNull: ["$user.email", ""] },
        score: 1,
        correctAnswers: 1,
        wrongAnswers: 1,
        skipped: 1,
        accuracy: 1,
        timeTaken: 1,
        submittedAt: 1,
      },
    },
  ];

  const results = await PrelimsTestAttempt.aggregate(pipeline);
  return results.map((a, index) => ({
    rank: index + 1,
    userId: a.userId,
    name: a.name ?? "Unknown",
    email: a.email ?? "",
    score: a.score,
    correctAnswers: a.correctAnswers,
    wrongAnswers: a.wrongAnswers,
    skipped: a.skipped,
    accuracy: a.accuracy,
    timeTaken: a.timeTaken,
    submittedAt: a.submittedAt,
  }));
}
