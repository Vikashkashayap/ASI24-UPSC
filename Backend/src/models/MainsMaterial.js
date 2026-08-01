import mongoose from "mongoose";



const pdfFileSchema = new mongoose.Schema(

  {

    /** S3 object key (primary) */

    storageKey: { type: String, default: "" },

    /** Public S3 URL (if bucket/CDN allows) */

    storageUrl: { type: String, default: "" },

    /** Alias of storageKey — kept for compatibility */

    filePath: { type: String, default: "" },

    originalName: { type: String, default: "" },

    fileSize: { type: Number, default: 0 },

    mimeType: { type: String, default: "application/pdf" },

  },

  { _id: false }

);



const mainsMaterialSchema = new mongoose.Schema(

  {

    sessionNumber: {

      type: Number,

      required: true,

      min: 1,

      index: true,

    },

    title: {

      type: String,

      required: true,

      trim: true,

      maxlength: 300,

    },

    description: {

      type: String,

      default: "",

      trim: true,

      maxlength: 5000,

    },

    videoUrl: {

      type: String,

      default: "",

      trim: true,

    },

    ppt: { type: pdfFileSchema, default: () => ({}) },

    workbook: { type: pdfFileSchema, default: () => ({}) },

    referenceCards: { type: pdfFileSchema, default: () => ({}) },

    status: {

      type: String,

      enum: ["published", "draft"],

      default: "draft",

      index: true,

    },

    createdBy: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,

    },

  },

  { timestamps: true }

);



mainsMaterialSchema.index({ sessionNumber: 1 }, { unique: true });



export const MainsMaterial = mongoose.model("MainsMaterial", mainsMaterialSchema);


