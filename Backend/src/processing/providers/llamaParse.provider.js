/**
 * LlamaParse provider — used when LLAMAPARSE_API_KEY is set.
 * Falls back gracefully when unavailable.
 */

const LLAMA_UPLOAD = "https://api.cloud.llamaindex.ai/api/v1/parsing/upload";
const LLAMA_JOB = (id) => `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${id}`;
const LLAMA_RESULT = (id) =>
  `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${id}/result/markdown`;

export function isLlamaParseConfigured() {
  return Boolean(String(process.env.LLAMAPARSE_API_KEY || "").trim());
}

export async function parseWithLlamaParse(buffer, filename = "document.pdf") {
  const apiKey = String(process.env.LLAMAPARSE_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("LLAMAPARSE_API_KEY not configured");
    err.code = "PROVIDER_NOT_CONFIGURED";
    throw err;
  }

  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);

  const uploadRes = await fetch(LLAMA_UPLOAD, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!uploadRes.ok) {
    throw new Error(`LlamaParse upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }
  const uploadJson = await uploadRes.json();
  const jobId = uploadJson.id || uploadJson.job_id;
  if (!jobId) throw new Error("LlamaParse did not return a job id");

  const maxAttempts = Number(process.env.LLAMAPARSE_MAX_POLL || 60);
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(LLAMA_JOB(jobId), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const statusJson = await statusRes.json();
    const status = String(statusJson.status || "").toUpperCase();
    if (status === "SUCCESS" || status === "COMPLETED") break;
    if (status === "ERROR" || status === "FAILED") {
      throw new Error(`LlamaParse job failed: ${JSON.stringify(statusJson)}`);
    }
  }

  const resultRes = await fetch(LLAMA_RESULT(jobId), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resultRes.ok) {
    throw new Error(`LlamaParse result failed: ${resultRes.status}`);
  }
  const resultJson = await resultRes.json();
  const markdown = resultJson.markdown || resultJson.text || "";
  const pages = String(markdown)
    .split(/\n-{3,}\n|\f/)
    .map((text, idx) => ({
      pageNumber: idx + 1,
      text: text.trim(),
      headings: [],
      tables: [],
      footnotes: [],
      references: [],
      imagesMetadata: [],
    }))
    .filter((p) => p.text);

  return {
    provider: "llamaparse",
    pages: pages.length ? pages : [{ pageNumber: 1, text: String(markdown).trim() }],
    fullText: String(markdown).trim(),
  };
}
