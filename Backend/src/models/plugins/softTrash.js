import mongoose from "mongoose";

/**
 * Soft-trash: documents disappear from normal queries until restored or purged.
 * Bypass with { isTrashed: true } in the filter, or Query option { withTrashed: true }.
 */
export const TRASH_TTL_DAYS = Number(process.env.TRASH_TTL_DAYS || 30);

function applyNotTrashedFilter() {
  if (this.getOptions?.()?.withTrashed === true) return;
  const q = this.getQuery();
  if (Object.prototype.hasOwnProperty.call(q, "isTrashed")) return;
  this.where({ isTrashed: { $ne: true } });
}

export function applySoftTrash(schema) {
  schema.add({
    isTrashed: { type: Boolean, default: false, index: true },
    trashedAt: { type: Date, default: null },
    trashedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  });

  schema.index({ isTrashed: 1, trashedAt: 1 });

  schema.pre(/^find/, applyNotTrashedFilter);
  schema.pre("countDocuments", applyNotTrashedFilter);
  schema.pre("count", applyNotTrashedFilter);
  schema.pre("findOneAndUpdate", applyNotTrashedFilter);
  schema.pre("updateMany", applyNotTrashedFilter);
  schema.pre("updateOne", applyNotTrashedFilter);
}

export function trashPayload(userId) {
  return {
    isTrashed: true,
    trashedAt: new Date(),
    trashedBy: userId || null,
  };
}

export function restorePayload() {
  return {
    isTrashed: false,
    trashedAt: null,
    trashedBy: null,
  };
}

export function trashExpiresAt(trashedAt, ttlDays = TRASH_TTL_DAYS) {
  if (!trashedAt) return null;
  return new Date(new Date(trashedAt).getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

export function trashDaysLeft(trashedAt, ttlDays = TRASH_TTL_DAYS) {
  const expires = trashExpiresAt(trashedAt, ttlDays);
  if (!expires) return ttlDays;
  return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
