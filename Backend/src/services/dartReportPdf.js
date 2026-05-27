import { createCanvas } from "canvas";

const EMOTIONAL_COLORS = ["#2563eb", "#06b6d4", "#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"];

function renderChart(drawFn, width = 500, height = 220) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  drawFn(ctx, width, height);
  return canvas.toBuffer("image/png");
}

function drawCardTitle(ctx, title, subtitle, w) {
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(title, 12, 22);
  if (subtitle) {
    ctx.fillStyle = "#64748b";
    ctx.font = "11px sans-serif";
    ctx.fillText(subtitle, 12, 38);
  }
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, 219);
}

function drawPieChart(ctx, w, h, data, title, subtitle) {
  drawCardTitle(ctx, title, subtitle, w);
  const cx = w * 0.38;
  const cy = h * 0.58;
  const r = Math.min(w, h) * 0.28;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  data.forEach((d) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = d.color || "#94a3b8";
    ctx.fill();
    angle += slice;
  });
  let ly = 55;
  data.forEach((d) => {
    ctx.fillStyle = d.color || "#94a3b8";
    ctx.fillRect(w - 155, ly, 10, 10);
    ctx.fillStyle = "#334155";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${d.name}: ${d.value}h`, w - 140, ly + 9);
    ly += 16;
  });
}

function drawLineChart(ctx, w, h, data, title, subtitle) {
  drawCardTitle(ctx, title, subtitle, w);
  const pad = { l: 45, r: 15, t: 50, b: 35 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const maxY = Math.max(8, ...data.flatMap((d) => [d.studyHours, d.targetHours]), 1);
  const n = Math.max(data.length, 1);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(String(Math.round(maxY - (maxY * i) / 4)), 8, y + 3);
  }

  const xAt = (i) => pad.l + (chartW * (i + 0.5)) / n;
  const yAt = (v) => pad.t + chartH - (v / maxY) * chartH;

  const drawLine = (key, color, dashed) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([5, 4]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xAt(i);
      const y = yAt(d[key]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    data.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(xAt(i), yAt(d[key]), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  };

  drawLine("studyHours", "#2563eb", false);
  drawLine("targetHours", "#06b6d4", true);

  ctx.fillStyle = "#64748b";
  ctx.font = "9px sans-serif";
  data.forEach((d, i) => {
    ctx.textAlign = "center";
    ctx.fillText(d.day, xAt(i), h - 12);
  });
  ctx.textAlign = "left";
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(pad.l, 8, 12, 3);
  ctx.fillStyle = "#334155";
  ctx.font = "9px sans-serif";
  ctx.fillText("Study", pad.l + 16, 12);
  ctx.strokeStyle = "#06b6d4";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(pad.l + 55, 10);
  ctx.lineTo(pad.l + 70, 10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText("Target", pad.l + 76, 12);
}

function drawGroupedBarChart(ctx, w, h, data, title, subtitle) {
  drawCardTitle(ctx, title, subtitle, w);
  const pad = { l: 35, r: 15, t: 50, b: 40 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const maxY = Math.max(8, ...data.flatMap((d) => [d.target, d.actual]), 1);
  const n = Math.max(data.length, 1);
  const groupW = chartW / n;
  const barW = Math.min(14, groupW * 0.28);

  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (chartH * i) / 4;
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }

  data.forEach((d, i) => {
    const gx = pad.l + groupW * i + groupW / 2;
    const drawBar = (val, color, offset) => {
      const bh = (val / maxY) * chartH;
      ctx.fillStyle = color;
      ctx.fillRect(gx + offset - barW / 2, pad.t + chartH - bh, barW, bh);
    };
    drawBar(d.target, "#94a3b8", -barW * 0.55);
    drawBar(d.actual, "#2563eb", barW * 0.55);
    ctx.fillStyle = "#64748b";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.date, gx, h - 10);
  });
  ctx.textAlign = "left";
}

function drawHorizontalBarChart(ctx, w, h, data, title, subtitle) {
  drawCardTitle(ctx, title, subtitle, w);
  const items = data.slice(0, 8);
  if (!items.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font="12px sans-serif";
    ctx.fillText("No subject data", 20, 100);
    return;
  }
  const max = Math.max(...items.map((d) => d.count), 1);
  const rowH = 22;
  let y = 52;
  items.forEach((d) => {
    ctx.fillStyle = "#334155";
    ctx.font = "10px sans-serif";
    const label = d.name.length > 14 ? `${d.name.slice(0, 13)}…` : d.name;
    ctx.fillText(label, 12, y + 10);
    const barX = 120;
    const barMaxW = w - barX - 30;
    const barW = (d.count / max) * barMaxW;
    ctx.fillStyle = "#14b8a6";
    ctx.fillRect(barX, y + 2, barW, 12);
    ctx.fillStyle = "#64748b";
    ctx.font = "9px sans-serif";
    ctx.fillText(String(d.count), barX + barW + 4, y + 11);
    y += rowH;
  });
}

function drawEmotionalPie(ctx, w, h, data, title, subtitle) {
  drawCardTitle(ctx, title, subtitle, w);
  if (!data.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("No emotional status logged", 20, 100);
    return;
  }
  const cx = w * 0.35;
  const cy = h * 0.58;
  const r = Math.min(w, h) * 0.26;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -Math.PI / 2;
  data.forEach((d, i) => {
    const slice = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = EMOTIONAL_COLORS[i % EMOTIONAL_COLORS.length];
    ctx.fill();
    angle += slice;
  });
  let ly = 55;
  data.forEach((d, i) => {
    ctx.fillStyle = EMOTIONAL_COLORS[i % EMOTIONAL_COLORS.length];
    ctx.fillRect(w - 160, ly, 10, 10);
    ctx.fillStyle = "#334155";
    ctx.font = "10px sans-serif";
    const label = d.name.length > 18 ? `${d.name.slice(0, 17)}…` : d.name;
    ctx.fillText(`${label}: ${d.value}`, w - 145, ly + 9);
    ly += 16;
  });
}

/**
 * Build rich 15-day DART report PDF with dashboard-style charts.
 */
export async function build15DayReportPdf(report) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const charts = report.charts;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageW = 595;
  const pageH = 842;
  const margin = 40;

  const chartImages = charts
    ? await Promise.all([
        charts.dailyTimeDistribution?.[0]?.name !== "No data"
          ? renderChart((ctx, w, h) =>
              drawPieChart(ctx, w, h, charts.dailyTimeDistribution, "Daily Time Distribution", "Study, Sleep, Work, Waste (avg)")
            )
          : null,
        charts.sevenDayStudyTrend?.length
          ? renderChart((ctx, w, h) =>
              drawLineChart(ctx, w, h, charts.sevenDayStudyTrend, "7 Day Study Trend", "Study hours over last 7 days")
            )
          : null,
        charts.targetVsActual?.length
          ? renderChart((ctx, w, h) =>
              drawGroupedBarChart(ctx, w, h, charts.targetVsActual, "Target vs Actual Study", "Last 7 days")
            )
          : null,
        charts.subjectFrequency?.length
          ? renderChart((ctx, w, h) =>
              drawHorizontalBarChart(ctx, w, h, charts.subjectFrequency, "Subject Frequency", "Days studied per subject")
            )
          : null,
        charts.emotionalStatusPie?.length
          ? renderChart((ctx, w, h) =>
              drawEmotionalPie(ctx, w, h, charts.emotionalStatusPie, "Emotional Status", "Mental health insights")
            )
          : null,
      ])
    : [];

  const [pieImg, lineImg, barImg, subjectImg, emotionalImg] = chartImages;
  const embed = async (buf) => (buf ? pdfDoc.embedPng(buf) : null);

  const [piePng, linePng, barPng, subjectPng, emotionalPng] = await Promise.all([
    embed(pieImg),
    embed(lineImg),
    embed(barImg),
    embed(subjectImg),
    embed(emotionalImg),
  ]);

  const addPage = () => pdfDoc.addPage([pageW, pageH]);

  // —— Page 1: Header + KPIs + first charts ——
  let page = addPage();
  let y = pageH - margin;

  const drawText = (pg, text, x, size, bold = false, color = rgb(0.1, 0.1, 0.2)) => {
    pg.drawText(String(text).substring(0, 120), {
      x: margin + x,
      y,
      size,
      font: bold ? fontBold : font,
      color,
    });
  };

  // Header band
  page.drawRectangle({
    x: margin,
    y: y - 8,
    width: pageW - margin * 2,
    height: 52,
    color: rgb(0.15, 0.39, 0.92),
  });
  const headerTitle = (report.reportTitle || "DART – Performance Report").substring(0, 80);
  page.drawText(headerTitle, {
    x: margin + 12,
    y: y + 18,
    size: headerTitle.length > 42 ? 14 : 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Mentors Daily | UPSC Preparation Analytics", {
    x: margin + 12,
    y: y + 2,
    size: 10,
    font,
    color: rgb(0.85, 0.92, 1),
  });
  y -= 68;

  drawText(page, `Student: ${report.enrollmentName}`, 0, 12, true);
  y -= 16;
  drawText(
    page,
    `Period: ${report.dateRange.from.toLocaleDateString("en-IN")} – ${report.dateRange.to.toLocaleDateString("en-IN")}  |  Days logged: ${report.totalDays}`,
    0,
    10
  );
  y -= 28;

  // KPI cards (2x2)
  const kpiW = (pageW - margin * 2 - 12) / 2;
  const kpiH = 52;
  const kpis = [
    { label: "Performance Score", value: String(charts?.performanceScore ?? report.performanceScoreAverage ?? 0), sub: charts?.performanceScoreLevel || "—", color: rgb(0.15, 0.39, 0.92) },
    { label: "Consistency Index", value: `${charts?.consistencyIndex ?? report.consistencyPercent ?? 0}%`, sub: "Days with 6+ hrs study", color: rgb(0.08, 0.72, 0.65) },
    { label: "Avg Study Hours", value: `${charts?.avgStudyHours ?? report.avgStudyHours ?? 0}h`, sub: "Per logged day", color: rgb(0.55, 0.36, 0.96) },
    { label: "Answer Writing", value: `${charts?.answerWritingWeeklyCount ?? 0} days`, sub: "Last 7 days", color: rgb(0.37, 0.35, 0.9) },
  ];

  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (kpiW + 12);
    const ky = y - row * (kpiH + 10);
    page.drawRectangle({ x, y: ky - kpiH, width: kpiW, height: kpiH, color: rgb(0.97, 0.98, 1), borderColor: rgb(0.88, 0.91, 0.96), borderWidth: 1 });
    page.drawRectangle({ x, y: ky - 6, width: kpiW, height: 6, color: kpi.color });
    page.drawText(kpi.label, { x: x + 10, y: ky - 22, size: 9, font, color: rgb(0.4, 0.45, 0.55) });
    page.drawText(kpi.value, { x: x + 10, y: ky - 38, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
    page.drawText(kpi.sub, { x: x + 10, y: ky - 50, size: 8, font, color: rgb(0.5, 0.55, 0.65) });
  });
  y -= kpiH * 2 + 24;

  const chartW = (pageW - margin * 2 - 10) / 2;
  const chartH = 118;
  const placeChart = (pg, png, xOff, yTop) => {
    if (!png) return;
    pg.drawImage(png, { x: margin + xOff, y: yTop - chartH, width: chartW, height: chartH });
  };

  placeChart(page, piePng, 0, y);
  placeChart(page, linePng, chartW + 10, y);
  y -= chartH + 20;

  // —— Page 2: More charts + wake-up ——
  page = addPage();
  y = pageH - margin;

  page.drawText("Performance Charts", { x: margin, y: y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
  y -= 22;

  placeChart(page, barPng, 0, y);
  placeChart(page, subjectPng, chartW + 10, y);
  y -= chartH + 24;

  page.drawText("Wake-up Consistency (Last 7 days)", { x: margin, y: y, size: 12, font: fontBold });
  y -= 18;
  const wakeRows = charts?.wakeUpConsistency || [];
  if (wakeRows.length) {
    wakeRows.forEach((row) => {
      page.drawRectangle({ x: margin, y: y - 16, width: pageW - margin * 2, height: 18, color: rgb(0.96, 0.97, 0.99) });
      page.drawText(row.date, { x: margin + 8, y: y - 12, size: 10, font });
      const wakeLabel = `${row.wakeUpTime}${row.before6 ? "  ✓ Before 6 AM" : ""}`;
      page.drawText(wakeLabel, {
        x: pageW - margin - 120,
        y: y - 12,
        size: 10,
        font,
        color: row.before6 ? rgb(0.13, 0.65, 0.35) : rgb(0.4, 0.45, 0.55),
      });
      y -= 22;
    });
  } else {
    page.drawText("No wake-up data logged.", { x: margin, y: y - 12, size: 10, font, color: rgb(0.5, 0.55, 0.65) });
    y -= 20;
  }

  // —— Page 3: Emotional + suggestions ——
  page = addPage();
  y = pageH - margin;

  if (emotionalPng) {
    page.drawImage(emotionalPng, { x: margin, y: y - chartH, width: pageW - margin * 2, height: chartH });
    y -= chartH + 24;
  }

  page.drawText("Improvement Suggestions", { x: margin, y: y, size: 13, font: fontBold });
  y -= 18;
  (report.improvementSuggestions || []).forEach((s) => {
    page.drawText(`• ${String(s).substring(0, 90)}`, { x: margin + 4, y: y - 12, size: 10, font, color: rgb(0.2, 0.25, 0.35) });
    y -= 16;
  });

  y -= 12;
  page.drawText("Summary", { x: margin, y: y, size: 13, font: fontBold });
  y -= 16;
  const summaryLines = [
    `Average study hours: ${report.avgStudyHours}h/day`,
    `Average waste time: ${report.avgWasteTime}h/day`,
    `Consistency (6+ hr days): ${report.consistencyPercent}%`,
    `Performance score average: ${report.performanceScoreAverage}`,
  ];
  summaryLines.forEach((line) => {
    page.drawText(line, { x: margin + 4, y: y - 12, size: 10, font });
    y -= 14;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
