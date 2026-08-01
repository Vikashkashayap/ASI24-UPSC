import mongoose from "mongoose";

/**
 * Explicit access grant for a note (purchase, admin grant, or promo).
 * Premium portal students (isPremiumStudent) do not need a row here.
 */
const notePermissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["purchase", "admin_grant", "promo", "bundle"],
      default: "purchase",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NoteOrder",
      default: null,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notePermissionSchema.index({ user: 1, note: 1 }, { unique: true });
notePermissionSchema.index({ user: 1, isActive: 1 });

export const NotePermission = mongoose.model("NotePermission", notePermissionSchema);
