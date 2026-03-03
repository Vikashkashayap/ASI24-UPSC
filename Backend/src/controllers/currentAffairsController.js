import CurrentAffair, { slugify } from "../models/CurrentAffair.js";
import { fetchGNews } from "../services/gnewsService.js";
import { generateCurrentAffairFromNews } from "../services/aiService.js";

/**
 * GET /api/current-affairs
 * Query: date (YYYY-MM-DD, optional), gsPaper, difficulty, search (keyword), limit, page
 * Returns today's active entries by default; supports filters.
 */
export async function listCurrentAffairs(req, res) {
  try {
    const {
      date,
      gsPaper,
      difficulty,
      search,
      limit = 12,
      page = 1,
    } = req.query;

    const filter = { isActive: true };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    } else {
      // Default: today (start of day to end of day, server time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filter.date = { $gte: today, $lt: tomorrow };
    }

    if (gsPaper) filter.gsPaper = gsPaper;
    if (difficulty) filter.difficulty = difficulty;
    if (search && search.trim()) {
      filter.$or = [
        { title: new RegExp(search.trim(), "i") },
        { summary: new RegExp(search.trim(), "i") },
        { keywords: new RegExp(search.trim(), "i") },
      ];
    }

    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
    const skip = Math.max(0, (Number(page) || 1) - 1) * limitNum;

    const [items, total] = await Promise.all([
      CurrentAffair.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CurrentAffair.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page: Math.floor(skip / limitNum) + 1,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error("listCurrentAffairs error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list current affairs",
    });
  }
}

/**
 * GET /api/current-affairs/:slug
 * Returns single article by slug (SEO-friendly).
 */
export async function getCurrentAffairBySlug(req, res) {
  try {
    const { slug } = req.params;
    const doc = await CurrentAffair.findOne({ slug, isActive: true }).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Current affair not found",
      });
    }
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error("getCurrentAffairBySlug error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to get current affair",
    });
  }
}

/**
 * PATCH /api/current-affairs/:id
 * Toggle isActive (admin only).
 */
export async function toggleCurrentAffair(req, res) {
  try {
    const { id } = req.params;
    const doc = await CurrentAffair.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Current affair not found",
      });
    }
    doc.isActive = !doc.isActive;
    await doc.save();
    return res.json({
      success: true,
      data: { _id: doc._id, isActive: doc.isActive },
    });
  } catch (err) {
    console.error("toggleCurrentAffair error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to toggle current affair",
    });
  }
}

/**
 * POST /api/current-affairs/run-now
 * Manually trigger fetch + AI + save (admin only). Idempotent by title.
 */
export async function runCurrentAffairsJob(req, res) {
  try {
    const articles = await fetchGNews({ max: 5 });
    if (!articles.length) {
      return res.json({
        success: true,
        message: "No articles fetched from GNews",
        data: { created: 0, skipped: 0 },
      });
    }

    let created = 0;
    let skipped = 0;

    for (const article of articles) {
      const title = (article.title || "").trim();
      if (!title) continue;

      const existing = await CurrentAffair.findOne({
        title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        const structured = await generateCurrentAffairFromNews(article, article.url);
        const slugBase = slugify(structured.title);
        let slug = slugBase;
        let counter = 0;
        while (await CurrentAffair.findOne({ slug })) {
          counter += 1;
          slug = `${slugBase}-${counter}`;
        }
        await CurrentAffair.create({
          ...structured,
          slug,
          sourceUrl: structured.sourceUrl || article.url || "",
          date: new Date(),
          isActive: true,
        });
        created += 1;
      } catch (aiErr) {
        console.error("AI generation failed for article:", title, aiErr);
        skipped += 1;
      }
    }

    return res.json({
      success: true,
      message: `Processed ${articles.length} articles`,
      data: { created, skipped },
    });
  } catch (err) {
    console.error("runCurrentAffairsJob error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to run current affairs job",
    });
  }
}

/**
 * GET /api/current-affairs/mcqs/:id
 * Generate 2 Prelims MCQs for a current affair (bonus).
 */
export async function generateMcqs(req, res) {
  try {
    const { id } = req.params;
    const doc = await CurrentAffair.findOne({ _id: id, isActive: true }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Current affair not found" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "OPENROUTER_API_KEY not set" });
    }

    const prompt = `You are a UPSC Prelims question setter. Based on the following current affair, generate exactly 2 multiple choice questions (Prelims style).

Current affair title: ${doc.title}
Summary: ${doc.summary}
Key points: ${(doc.keyPoints || []).join("; ")}

For each question output STRICT JSON array of 2 objects:
[
  {
    "question": "Question text?",
    "options": { "A": "text", "B": "text", "C": "text", "D": "text" },
    "correctAnswer": "A" | "B" | "C" | "D",
    "explanation": "Brief explanation"
  },
  { ... }
]
Return ONLY the JSON array, no other text.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
        "X-Title": "MentorsDaily - Current Affairs MCQs",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} – ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content?.trim() || "";
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    const mcqs = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const safeMcqs = Array.isArray(mcqs) ? mcqs.slice(0, 2) : [];

    return res.json({ success: true, data: { mcqs: safeMcqs } });
  } catch (err) {
    console.error("generateMcqs error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to generate MCQs",
    });
  }
}

/**
 * GET /api/current-affairs/admin/list
 * Admin: list all (including inactive), with pagination and filters.
 */
export async function adminList(req, res) {
  try {
    const { page = 1, limit = 20, isActive, gsPaper, difficulty } = req.query;
    const filter = {};
    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }
    if (gsPaper) filter.gsPaper = gsPaper;
    if (difficulty) filter.difficulty = difficulty;

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit) || 20);
    const limitNum = Math.min(100, Number(limit) || 20);

    const [items, total] = await Promise.all([
      CurrentAffair.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      CurrentAffair.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page: Math.floor(skip / limitNum) + 1,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error("adminList current affairs error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list current affairs",
    });
  }
}
