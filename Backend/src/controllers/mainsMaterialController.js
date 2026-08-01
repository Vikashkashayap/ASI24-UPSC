import { MainsMaterial } from "../models/MainsMaterial.js";

import {

  saveMainsMaterialPdf,

  removeMainsMaterialFile,

  resolveMainsMaterialStorageKey,

  streamMainsMaterialToResponse,

  MAINS_MATERIAL_FILE_TYPES,

} from "../services/mainsMaterialUpload.service.js";



const FILE_FIELD_MAP = {

  ppt: "ppt",

  workbook: "workbook",

  referenceCards: "referenceCards",

};



function emptyFileMeta() {

  return {

    storageKey: "",

    storageUrl: "",

    filePath: "",

    originalName: "",

    fileSize: 0,

    mimeType: "application/pdf",

  };

}



function hasStoredFile(meta) {

  return Boolean(resolveMainsMaterialStorageKey(meta));

}



function toPublicSession(doc) {

  const lean = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

  const ppt = hasStoredFile(lean.ppt) ? lean.ppt : null;

  const workbook = hasStoredFile(lean.workbook) ? lean.workbook : null;

  const referenceCards = hasStoredFile(lean.referenceCards) ? lean.referenceCards : null;



  return {

    _id: lean._id,

    sessionNumber: lean.sessionNumber,

    title: lean.title,

    description: lean.description || "",

    videoUrl: lean.videoUrl || "",

    status: lean.status,

    ppt: ppt

      ? {

          originalName: ppt.originalName,

          fileSize: ppt.fileSize,

          hasFile: true,

        }

      : null,

    workbook: workbook

      ? {

          originalName: workbook.originalName,

          fileSize: workbook.fileSize,

          hasFile: true,

        }

      : null,

    referenceCards: referenceCards

      ? {

          originalName: referenceCards.originalName,

          fileSize: referenceCards.fileSize,

          hasFile: true,

        }

      : null,

    createdAt: lean.createdAt,

    updatedAt: lean.updatedAt,

  };

}



function parseSessionNumber(value) {

  const n = Number(value);

  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;

  return n;

}



function normalizeStatus(value) {

  return value === "published" ? "published" : "draft";

}



function pickMulterFile(req, fieldName) {

  const files = req.files?.[fieldName];

  return Array.isArray(files) && files[0] ? files[0] : null;

}



async function persistUploadedField(req, fieldName) {

  const file = pickMulterFile(req, fieldName);

  if (!file) return null;

  return saveMainsMaterialPdf({

    buffer: file.buffer,

    originalName: file.originalname,

    mimeType: file.mimetype,

    fileType: fieldName,

  });

}



/**

 * Admin: list all sessions (draft + published), sorted by session number.

 * GET /api/admin/mains-materials

 */

export const listAdminSessions = async (req, res) => {

  try {

    const sessions = await MainsMaterial.find().sort({ sessionNumber: 1 });

    return res.json({

      success: true,

      data: sessions.map((s) => toPublicSession(s)),

    });

  } catch (err) {

    console.error("listAdminSessions:", err);

    return res.status(500).json({ success: false, message: err.message });

  }

};



/**

 * Admin: get one session by id.

 * GET /api/admin/mains-materials/:id

 */

export const getAdminSession = async (req, res) => {

  try {

    const session = await MainsMaterial.findById(req.params.id);

    if (!session) {

      return res.status(404).json({ success: false, message: "Session not found" });

    }

    return res.json({ success: true, data: toPublicSession(session) });

  } catch (err) {

    console.error("getAdminSession:", err);

    return res.status(500).json({ success: false, message: err.message });

  }

};



/**

 * Admin: create session (multipart optional PDFs → S3).

 * POST /api/admin/mains-materials

 */

export const createSession = async (req, res) => {

  try {

    const sessionNumber = parseSessionNumber(req.body.sessionNumber);

    const title = String(req.body.title || "").trim();

    const description = String(req.body.description || "").trim();

    const videoUrl = String(req.body.videoUrl || "").trim();

    const status = normalizeStatus(req.body.status);



    if (!sessionNumber) {

      return res.status(400).json({

        success: false,

        message: "sessionNumber must be a positive integer",

      });

    }

    if (!title) {

      return res.status(400).json({ success: false, message: "title is required" });

    }



    const existing = await MainsMaterial.findOne({ sessionNumber });

    if (existing) {

      return res.status(409).json({

        success: false,

        message: `Session number ${sessionNumber} already exists`,

      });

    }



    const ppt = (await persistUploadedField(req, "ppt")) || emptyFileMeta();

    const workbook = (await persistUploadedField(req, "workbook")) || emptyFileMeta();

    const referenceCards = (await persistUploadedField(req, "referenceCards")) || emptyFileMeta();



    const createdBy =

      req.user?._id && String(req.user._id) !== "000000000000000000000000"

        ? req.user._id

        : null;



    const session = await MainsMaterial.create({

      sessionNumber,

      title,

      description,

      videoUrl,

      status,

      ppt,

      workbook,

      referenceCards,

      createdBy,

    });



    return res.status(201).json({

      success: true,

      data: toPublicSession(session),

    });

  } catch (err) {

    console.error("createSession:", err);

    if (err?.code === 11000) {

      return res.status(409).json({

        success: false,

        message: "Session number already exists",

      });

    }

    return res.status(500).json({ success: false, message: err.message });

  }

};



/**

 * Admin: update session (multipart optional PDFs → S3).

 * PUT /api/admin/mains-materials/:id

 */

export const updateSession = async (req, res) => {

  try {

    const session = await MainsMaterial.findById(req.params.id);

    if (!session) {

      return res.status(404).json({ success: false, message: "Session not found" });

    }



    if (req.body.sessionNumber !== undefined) {

      const sessionNumber = parseSessionNumber(req.body.sessionNumber);

      if (!sessionNumber) {

        return res.status(400).json({

          success: false,

          message: "sessionNumber must be a positive integer",

        });

      }

      if (sessionNumber !== session.sessionNumber) {

        const clash = await MainsMaterial.findOne({

          sessionNumber,

          _id: { $ne: session._id },

        });

        if (clash) {

          return res.status(409).json({

            success: false,

            message: `Session number ${sessionNumber} already exists`,

          });

        }

        session.sessionNumber = sessionNumber;

      }

    }



    if (req.body.title !== undefined) {

      const title = String(req.body.title || "").trim();

      if (!title) {

        return res.status(400).json({ success: false, message: "title is required" });

      }

      session.title = title;

    }

    if (req.body.description !== undefined) {

      session.description = String(req.body.description || "").trim();

    }

    if (req.body.videoUrl !== undefined) {

      session.videoUrl = String(req.body.videoUrl || "").trim();

    }

    if (req.body.status !== undefined) {

      session.status = normalizeStatus(req.body.status);

    }



    const clearFlags = {

      ppt: req.body.clearPpt === "true" || req.body.clearPpt === true,

      workbook: req.body.clearWorkbook === "true" || req.body.clearWorkbook === true,

      referenceCards:

        req.body.clearReferenceCards === "true" || req.body.clearReferenceCards === true,

    };



    for (const field of MAINS_MATERIAL_FILE_TYPES) {

      const uploaded = await persistUploadedField(req, field);

      if (uploaded) {

        if (hasStoredFile(session[field])) {

          await removeMainsMaterialFile(session[field]);

        }

        session[field] = uploaded;

      } else if (clearFlags[field]) {

        if (hasStoredFile(session[field])) {

          await removeMainsMaterialFile(session[field]);

        }

        session[field] = emptyFileMeta();

      }

    }



    await session.save();

    return res.json({

      success: true,

      data: toPublicSession(session),

    });

  } catch (err) {

    console.error("updateSession:", err);

    if (err?.code === 11000) {

      return res.status(409).json({

        success: false,

        message: "Session number already exists",

      });

    }

    return res.status(500).json({ success: false, message: err.message });

  }

};



/**

 * Admin: delete session and its S3 PDFs.

 * DELETE /api/admin/mains-materials/:id

 */

export const deleteSession = async (req, res) => {

  try {

    const session = await MainsMaterial.findByIdAndDelete(req.params.id);

    if (!session) {

      return res.status(404).json({ success: false, message: "Session not found" });

    }



    await Promise.all([

      removeMainsMaterialFile(session.ppt),

      removeMainsMaterialFile(session.workbook),

      removeMainsMaterialFile(session.referenceCards),

    ]);



    return res.json({ success: true, message: "Session deleted" });

  } catch (err) {

    console.error("deleteSession:", err);

    return res.status(500).json({ success: false, message: err.message });

  }

};



/**

 * Student: list published sessions sorted by session number.

 * GET /api/mains-materials

 */

export const listPublishedSessions = async (req, res) => {

  try {

    const sessions = await MainsMaterial.find({ status: "published" }).sort({

      sessionNumber: 1,

    });

    return res.json({

      success: true,

      data: sessions.map((s) => toPublicSession(s)),

    });

  } catch (err) {

    console.error("listPublishedSessions:", err);

    return res.status(500).json({ success: false, message: err.message });

  }

};



/**

 * Stream a PDF from S3 (admin always; students only for published sessions).

 * GET /api/mains-materials/:id/file/:type

 * Also: GET /api/admin/mains-materials/:id/file/:type

 */

export const downloadSessionFile = async (req, res) => {

  try {

    const type = FILE_FIELD_MAP[req.params.type];

    if (!type) {

      return res.status(400).json({

        success: false,

        message: "Invalid file type. Use ppt, workbook, or referenceCards",

      });

    }



    const session = await MainsMaterial.findById(req.params.id);

    if (!session) {

      return res.status(404).json({ success: false, message: "Session not found" });

    }



    const isAdmin = req.user?.role === "admin";

    if (!isAdmin && session.status !== "published") {

      return res.status(404).json({ success: false, message: "Session not found" });

    }



    const meta = session[type];

    if (!hasStoredFile(meta)) {

      return res.status(404).json({ success: false, message: "File not uploaded" });

    }



    const downloadName = meta.originalName || `${type}.pdf`;

    return await streamMainsMaterialToResponse(meta, res, downloadName);

  } catch (err) {

    console.error("downloadSessionFile:", err);

    if (res.headersSent) return;

    const status = err?.status || (err?.name === "NoSuchKey" ? 404 : 500);

    return res.status(status).json({

      success: false,

      message: err.message || "Failed to download file",

    });

  }

};


