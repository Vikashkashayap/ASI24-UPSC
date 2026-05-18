import { Offer } from "../models/Offer.js";

/**
 * Public: Get current active offer (single one for banner).
 * Active = isActive true, isHidden false, and today between startDate and endDate.
 * GET /api/offers/active
 */
export const getActiveOffer = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const offer = await Offer.findOne({
      isActive: true,
      isHidden: false,
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday },
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: offer || null });
  } catch (err) {
    console.error("getActiveOffer:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: List all offers.
 * GET /api/admin/offers
 */
export const listOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: offers });
  } catch (err) {
    console.error("listOffers:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Create offer.
 * POST /api/admin/offers
 */
export const createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      discount,
      startDate,
      endDate,
      isActive,
      isHidden,
      ctaText,
      redirectUrl,
    } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "title, startDate, and endDate are required",
      });
    }

    const offer = await Offer.create({
      title: String(title).trim(),
      description: String(description || "").trim(),
      discount: Number(discount) || 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: Boolean(isActive),
      isHidden: Boolean(isHidden),
      ctaText: String(ctaText || "Claim Offer").trim(),
      redirectUrl: String(redirectUrl || "").trim(),
    });

    return res.status(201).json({ success: true, data: offer });
  } catch (err) {
    console.error("createOffer:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Update offer.
 * PUT /api/admin/offers/:id
 */
export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      discount,
      startDate,
      endDate,
      isActive,
      isHidden,
      ctaText,
      redirectUrl,
    } = req.body;

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (title !== undefined) offer.title = String(title).trim();
    if (description !== undefined) offer.description = String(description).trim();
    if (discount !== undefined) offer.discount = Number(discount) || 0;
    if (startDate !== undefined) offer.startDate = new Date(startDate);
    if (endDate !== undefined) offer.endDate = new Date(endDate);
    if (typeof isActive === "boolean") offer.isActive = isActive;
    if (typeof isHidden === "boolean") offer.isHidden = isHidden;
    if (ctaText !== undefined) offer.ctaText = String(ctaText).trim();
    if (redirectUrl !== undefined) offer.redirectUrl = String(redirectUrl).trim();

    await offer.save();
    return res.json({ success: true, data: offer });
  } catch (err) {
    console.error("updateOffer:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Delete offer.
 * DELETE /api/admin/offers/:id
 */
export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    return res.json({ success: true, message: "Offer deleted" });
  } catch (err) {
    console.error("deleteOffer:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
