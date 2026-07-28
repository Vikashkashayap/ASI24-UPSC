/**
 * Mistral OCR provider — used for scanned PDFs when MISTRAL_API_KEY is set.
 */

export function isMistralOcrConfigured() {
  return Boolean(String(process.env.MISTRAL_API_KEY || "").trim());
}

/**
 * Call Mistral OCR API with a PDF/image buffer.
 * Uses document_url data URI pattern from Mistral OCR docs.
 */
export async function ocrWithMistral(buffer, mimeType = "application/pdf") {
  const apiKey = String(process.env.MISTRAL_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("MISTRAL_API_KEY not configured");
    err.code = "PROVIDER_NOT_CONFIGURED";
    throw err;
  }

  const model = process.env.MISTRAL_OCR_MODEL || "mistral-ocr-latest";
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      document: {
        type: "document_url",
        document_url: dataUrl,
      },
      include_image_base64: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Mistral OCR failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const pages = (json.pages || []).map((p, idx) => ({
    pageNumber: p.index != null ? p.index + 1 : idx + 1,
    text: String(p.markdown || p.text || "").trim(),
    headings: [],
    tables: [],
    footnotes: [],
    references: [],
    imagesMetadata: (p.images || []).map((img, i) => ({
      index: i,
      width: img.width,
      height: img.height,
      alt: img.id || "",
    })),
  }));

  const fullText = pages.map((p) => p.text).filter(Boolean).join("\n\n");
  return { provider: "mistral-ocr", pages, fullText };
}
