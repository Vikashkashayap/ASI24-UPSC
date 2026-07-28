import mongoose from "mongoose";

const searchLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    query: { type: String, required: true },
    searchType: {
      type: String,
      enum: ["hybrid", "topic", "question", "concept", "similar", "keyword", "semantic", "notes"],
      default: "hybrid",
    },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    resultCount: { type: Number, default: 0 },
    topScore: { type: Number, default: null },
    latencyMs: { type: Number, default: 0 },
    cached: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "search_logs" }
);

searchLogSchema.index({ createdAt: -1 });
searchLogSchema.index({ query: 1, createdAt: -1 });

export const SearchLog = mongoose.model("SearchLog", searchLogSchema);
export default SearchLog;
