import { UpscSyllabus } from "../models/UpscSyllabus.js";
import { parseSyllabusWorkbook } from "../services/syllabusExcelService.js";

export const uploadSyllabusExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Excel file is required (field: file)" });
    }
    const { subjects, totalTopicRows } = parseSyllabusWorkbook(req.file.buffer);
    if (!subjects.length) {
      return res.status(400).json({ message: "No sheets or topics found in workbook" });
    }

    const label = (req.body?.label || req.file.originalname || "Syllabus").slice(0, 200);

    await UpscSyllabus.updateMany({}, { $set: { isActive: false } });

    const doc = await UpscSyllabus.create({
      label,
      uploadedBy: req.user._id,
      fileName: req.file.originalname || "",
      subjects,
      totalTopicRows,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      syllabus: doc,
      message: `Imported ${subjects.length} subject sheet(s), ${totalTopicRows} topic row(s)`,
    });
  } catch (err) {
    console.error("Syllabus upload error:", err);
    res.status(400).json({ message: err.message || "Upload failed" });
  }
};

export const listSyllabi = async (req, res) => {
  try {
    const items = await UpscSyllabus.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ message: err.message || "List failed" });
  }
};

export const getActiveSyllabus = async (req, res) => {
  try {
    const s = await UpscSyllabus.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: s });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed" });
  }
};
