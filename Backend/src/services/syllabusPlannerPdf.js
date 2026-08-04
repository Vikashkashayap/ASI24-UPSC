/**
 * Student Module Targets / planner PDF (offline study plan).
 * Uses pdf-lib StandardFonts (WinAnsi) — non-Latin glyphs are safely stripped.
 */

function safeText(value, maxLen = 200) {
  const raw = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    // WinAnsi / Helvetica-safe: drop characters StandardFonts cannot encode
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
    .trim();
  if (!raw) return "—";
  return raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw;
}

function formatDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupBySubject(targets) {
  const map = new Map();
  for (const t of targets) {
    const key = t.subjectKey || "other";
    let g = map.get(key);
    if (!g) {
      g = {
        subjectKey: key,
        subjectName: t.subjectName || key,
        modules: [],
      };
      map.set(key, g);
    }
    g.modules.push(t);
  }
  return [...map.values()];
}

/**
 * @param {{
 *   studentName: string,
 *   targets: Array<Record<string, unknown>>,
 *   activeCount: number,
 *   completedCount: number,
 * }} payload
 * @returns {Promise<Buffer>}
 */
export async function buildSyllabusPlannerPdf(payload) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595;
  const pageH = 842;
  const margin = 40;
  const contentW = pageW - margin * 2;
  const blue = rgb(0.15, 0.39, 0.92);
  const navy = rgb(0.06, 0.12, 0.24);
  const muted = rgb(0.4, 0.45, 0.55);
  const green = rgb(0.09, 0.55, 0.32);
  const lightBlue = rgb(0.94, 0.96, 1);
  const lightGray = rgb(0.96, 0.97, 0.99);

  let page = pdfDoc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const ensureSpace = (needed) => {
    if (y - needed < margin + 24) {
      page.drawText("Mentors Daily · Module Targets Planner", {
        x: margin,
        y: 18,
        size: 8,
        font,
        color: muted,
      });
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  };

  const drawWrapped = (text, opts = {}) => {
    const {
      size = 10,
      bold = false,
      color = navy,
      indent = 0,
      lineH = size + 4,
      maxWidth = contentW - indent,
    } = opts;
    const f = bold ? fontBold : font;
    const words = safeText(text, 2000).split(" ");
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      const w = f.widthOfTextAtSize(next, size);
      if (w > maxWidth && line) {
        ensureSpace(lineH + 2);
        page.drawText(line, {
          x: margin + indent,
          y: y - size,
          size,
          font: f,
          color,
        });
        y -= lineH;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      ensureSpace(lineH + 2);
      page.drawText(line, {
        x: margin + indent,
        y: y - size,
        size,
        font: f,
        color,
      });
      y -= lineH;
    }
  };

  // Header band
  page.drawRectangle({
    x: margin,
    y: y - 8,
    width: contentW,
    height: 52,
    color: blue,
  });
  const headerTitle = safeText(
    payload.title ||
      (payload.subjectName
        ? `${payload.subjectName} — Module Targets Planner`
        : "Module Targets Planner"),
    55
  );
  page.drawText(headerTitle, {
    x: margin + 12,
    y: y + 18,
    size: headerTitle.length > 40 ? 13 : 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Mentors Daily | Subject-wise offline study plan", {
    x: margin + 12,
    y: y + 2,
    size: 10,
    font,
    color: rgb(0.85, 0.92, 1),
  });
  y -= 68;

  const studentName = safeText(payload.studentName || "Student", 60);
  const generated = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const activeCount = Number(payload.activeCount) || 0;
  const completedCount = Number(payload.completedCount) || 0;
  const targets = Array.isArray(payload.targets) ? payload.targets : [];

  drawWrapped(`Student: ${studentName}`, { size: 12, bold: true });
  y -= 2;
  if (payload.subjectName) {
    drawWrapped(`Subject: ${safeText(payload.subjectName, 60)}`, {
      size: 11,
      bold: true,
      color: blue,
    });
    y -= 2;
  }
  drawWrapped(
    `Generated: ${generated}  |  Active: ${activeCount}  |  Done: ${completedCount}  |  Total: ${targets.length}`,
    { size: 10, color: muted }
  );
  y -= 8;

  page.drawRectangle({
    x: margin,
    y: y - 28,
    width: contentW,
    height: 32,
    color: lightBlue,
    borderColor: rgb(0.82, 0.88, 0.98),
    borderWidth: 1,
  });
  page.drawText(
    "Tip: Tick chapters offline against this plan. Open Mentors Daily to take Module Finals.",
    {
      x: margin + 10,
      y: y - 20,
      size: 9,
      font,
      color: rgb(0.2, 0.35, 0.65),
    }
  );
  y -= 44;

  if (!targets.length) {
    drawWrapped("No module targets assigned yet.", { size: 11, color: muted });
  } else {
    const groups = groupBySubject(targets);

    for (const group of groups) {
      ensureSpace(40);
      page.drawRectangle({
        x: margin,
        y: y - 22,
        width: contentW,
        height: 26,
        color: navy,
      });
      const subjectLabel = safeText(
        `${group.subjectName}  (${group.modules.length} module${group.modules.length === 1 ? "" : "s"})`,
        80
      );
      page.drawText(subjectLabel, {
        x: margin + 10,
        y: y - 16,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      y -= 34;

      for (const mod of group.modules) {
        const status = mod.completed ? "DONE" : "ACTIVE";
        const statusColor = mod.completed ? green : blue;
        const due = formatDue(mod.dueDate);
        const metaParts = [];
        if (mod.chapterRange) metaParts.push(safeText(mod.chapterRange, 40));
        if (mod.durationLabel) metaParts.push(safeText(mod.durationLabel, 40));
        else {
          const hrs = mod.estimatedHours != null ? `~${mod.estimatedHours} h` : "";
          const days = mod.estimatedDays != null ? `${mod.estimatedDays} days` : "";
          if (hrs || days) metaParts.push([hrs, days].filter(Boolean).join(" · "));
        }
        if (due) metaParts.push(`Due ${due}`);

        const chapters = Array.isArray(mod.topicsPreview) ? mod.topicsPreview : [];
        const doneSet = new Set(mod.completedChapters || []);
        const doneCh = chapters.filter((c) => doneSet.has(c)).length;
        const chapterNeed =
          chapters.length > 0
            ? Math.max(18, 14 + chapters.length * 13)
            : 8;
        ensureSpace(52 + chapterNeed);

        // Module card background
        const cardTop = y;
        page.drawRectangle({
          x: margin,
          y: y - 4,
          width: 4,
          height: 18,
          color: statusColor,
        });

        const title = safeText(
          `${mod.moduleId || ""} ${mod.moduleName || "Module"}`.trim(),
          70
        );
        page.drawText(title, {
          x: margin + 12,
          y: y - 12,
          size: 11,
          font: fontBold,
          color: navy,
        });

        const statusW = fontBold.widthOfTextAtSize(status, 8);
        page.drawRectangle({
          x: pageW - margin - statusW - 14,
          y: y - 16,
          width: statusW + 10,
          height: 14,
          color: mod.completed ? rgb(0.88, 0.97, 0.92) : rgb(0.9, 0.93, 1),
        });
        page.drawText(status, {
          x: pageW - margin - statusW - 9,
          y: y - 12,
          size: 8,
          font: fontBold,
          color: statusColor,
        });
        y -= 20;

        if (metaParts.length) {
          drawWrapped(metaParts.join("  ·  "), {
            size: 9,
            color: muted,
            indent: 12,
          });
        }

        if (chapters.length) {
          drawWrapped(`Chapters: ${doneCh}/${chapters.length} complete`, {
            size: 9,
            bold: true,
            color: muted,
            indent: 12,
          });
          for (const ch of chapters) {
            const done = doneSet.has(ch);
            const mark = done ? "[x]" : "[ ]";
            drawWrapped(`${mark}  ${safeText(ch, 90)}`, {
              size: 9,
              color: done ? green : navy,
              indent: 18,
              lineH: 12,
            });
          }
        }

        if (mod.note) {
          ensureSpace(20);
          page.drawRectangle({
            x: margin + 12,
            y: y - 16,
            width: contentW - 12,
            height: 18,
            color: rgb(1, 0.98, 0.9),
          });
          page.drawText(`Note: ${safeText(mod.note, 95)}`, {
            x: margin + 18,
            y: y - 12,
            size: 8,
            font,
            color: rgb(0.45, 0.35, 0.1),
          });
          y -= 22;
        }

        // subtle separator
        y -= 6;
        page.drawRectangle({
          x: margin,
          y: y,
          width: contentW,
          height: 1,
          color: lightGray,
        });
        y -= 10;

        void cardTop;
      }

      y -= 6;
    }
  }

  // Footer on last page
  page.drawText("Mentors Daily · Module Targets Planner", {
    x: margin,
    y: 18,
    size: 8,
    font,
    color: muted,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
