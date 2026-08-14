import {
  listTrash,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  bulkRestoreTrash,
  bulkPermanentDeleteTrash,
  TRASH_CATEGORIES,
} from "../services/trash.service.js";

function parsePage(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const type = String(req.query.type || "all").toLowerCase();
  return {
    page,
    limit,
    type: TRASH_CATEGORIES.includes(type) ? type : "all",
    search: String(req.query.search || "").trim(),
    student: String(req.query.student || "").trim(),
  };
}

function parseKind(kind) {
  const k = String(kind || "").toLowerCase();
  if (k === "tests" || k === "test") return "test";
  if (k === "evaluations" || k === "evaluation") return "evaluation";
  return null;
}

export const getTrash = async (req, res) => {
  try {
    const data = await listTrash(parsePage(req));
    res.json({ success: true, data });
  } catch (error) {
    console.error("trash list:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load trash",
    });
  }
};

export const restoreFromTrash = async (req, res) => {
  try {
    const kind = parseKind(req.params.kind);
    if (!kind) {
      return res.status(400).json({ success: false, message: "Invalid trash item type" });
    }
    const doc = await restoreTrashItem(kind, req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Item not found in trash",
      });
    }
    res.json({
      success: true,
      message: "Item restored",
    });
  } catch (error) {
    console.error("trash restore:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to restore item",
    });
  }
};

export const permanentDeleteFromTrash = async (req, res) => {
  try {
    const kind = parseKind(req.params.kind);
    if (!kind) {
      return res.status(400).json({ success: false, message: "Invalid trash item type" });
    }
    const ok = await permanentlyDeleteTrashItem(kind, req.params.id);
    if (!ok) {
      return res.status(404).json({
        success: false,
        message: "Item not found in trash",
      });
    }
    res.json({
      success: true,
      message: "Item permanently deleted",
    });
  } catch (error) {
    console.error("trash permanent delete:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete item",
    });
  }
};

export const bulkRestoreFromTrash = async (req, res) => {
  try {
    const result = await bulkRestoreTrash(req.body?.items);
    res.json({
      success: true,
      message: `${result.restored} item(s) restored`,
      data: result,
    });
  } catch (error) {
    console.error("trash bulk restore:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to restore items",
    });
  }
};

export const bulkPermanentDeleteFromTrash = async (req, res) => {
  try {
    const result = await bulkPermanentDeleteTrash(req.body?.items);
    res.json({
      success: true,
      message: `${result.deleted} item(s) permanently deleted`,
      data: result,
    });
  } catch (error) {
    console.error("trash bulk delete:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete items",
    });
  }
};
