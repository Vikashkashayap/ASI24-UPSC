/**
 * AI Service – OpenRouter (OpenAI GPT-4o mini) for UPSC current affairs structured output
 * Uses strict JSON prompt; validates with schema expectations.
 * Model: openai/gpt-4o-mini (cost-effective).
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4o-mini";
const TEMPERATURE = 0.2;

const RELEVANCE_SYSTEM =
  "You are a UPSC civil services exam expert. Check if news is relevant for UPSC preparation. Return only YES or NO.";
const RELEVANCE_QUESTION = `Check if the following news is relevant for UPSC Civil Services Exam preparation.

Relevant categories include:
government policy
Supreme Court judgement
economy
environment
international relations
science and technology
defence
governance
social issues

Return only YES or NO.`;

const SYSTEM_PROMPT = `You are a former UPSC Mains examiner and policy analyst.
Analyze the given news and generate structured UPSC current affairs.
Focus on constitutional provisions, governance impact, socio-economic implications, international context and exam relevance.

Output STRICT JSON only, no markdown or extra text. Use this exact structure:
{
  "title": "string (concise headline)",
  "summary": "string (about 100 words)",
  "keyPoints": ["string", "string", "string", "string", "string"],
  "gsPaper": "GS1" | "GS2" | "GS3" | "GS4",
  "prelimsFocus": "string (factual angle for Prelims)",
  "mainsAngle": "string (analytical angle for Mains)",
  "keywords": ["string", "string", "string", "string", "string"],
  "difficulty": "Easy" | "Moderate" | "Hard"
}

Rules:
- summary: exactly ~100 words, exam-oriented.
- keyPoints: exactly 5 bullet points.
- keywords: exactly 5 keywords.
- gsPaper: one of GS1, GS2, GS3, GS4.
- difficulty: Easy | Moderate | Hard.
Return only the JSON object.`;

/**
 * Check if a news article is UPSC-relevant using OpenRouter LLM.
 * @param {Object} article - { title, description, content, url }
 * @returns {Promise<boolean>} true if response is YES (relevant)
 */
export async function isUpscRelevant(article) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment");
  }

  const { title = "", description = "", content = "" } = article;
  const text = [title, description, (content || "").slice(0, 1500)].filter(Boolean).join("\n\n");
  const userContent = `${RELEVANCE_QUESTION}\n\nNews:\n${text}`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "X-Title": "MentorsDaily - UPSC Relevance",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: RELEVANCE_SYSTEM },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter relevance check failed: ${response.status} – ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = (data?.choices?.[0]?.message?.content || "").trim().toUpperCase();
  return raw.startsWith("YES");
}

/**
 * Build user prompt from a single news article
 */
function buildUserPrompt(article) {
  const { title = "", description = "", content = "", url = "" } = article;
  const text = [title, description, content].filter(Boolean).join("\n\n");
  return `News article to analyze:

Title: ${title}
Description: ${description}
Content: ${content ? content.slice(0, 3000) : "(none)"}
Source URL: ${url}

Generate the UPSC current affairs JSON (strict JSON only).`;
}

/**
 * Parse and validate AI response into structured object
 */
function parseStructuredResponse(rawContent) {
  let content = (rawContent || "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[0];
  }
  const parsed = JSON.parse(content);
  const required = ["title", "summary", "keyPoints", "gsPaper", "prelimsFocus", "mainsAngle", "keywords", "difficulty"];
  for (const key of required) {
    if (parsed[key] === undefined) {
      if (key === "keyPoints" || key === "keywords") parsed[key] = [];
      else if (key === "prelimsFocus" || key === "mainsAngle") parsed[key] = "";
      else parsed[key] = String(parsed[key] ?? "");
    }
  }
  if (!Array.isArray(parsed.keyPoints)) parsed.keyPoints = [];
  if (!Array.isArray(parsed.keywords)) parsed.keywords = [];
  const validDifficulty = ["Easy", "Moderate", "Hard"];
  if (!validDifficulty.includes(parsed.difficulty)) parsed.difficulty = "Moderate";
  const validGs = ["GS1", "GS2", "GS3", "GS4"];
  if (!validGs.includes(parsed.gsPaper)) parsed.gsPaper = "GS2";
  return parsed;
}

/**
 * Generate UPSC current affairs structure from one news article
 * @param {Object} article - { title, description, content, url, publishedAt }
 * @param {string} [sourceUrl] - optional override URL
 * @returns {Promise<Object>} Structured affair (title, summary, keyPoints, gsPaper, prelimsFocus, mainsAngle, keywords, difficulty)
 */
export async function generateCurrentAffairFromNews(article, sourceUrl = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment");
  }

  const userPrompt = buildUserPrompt(article);
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "X-Title": "MentorsDaily - Current Affairs",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: TEMPERATURE,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} – ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("Empty response from OpenRouter");
  }

  const structured = parseStructuredResponse(rawContent);
  structured.sourceUrl = sourceUrl || article.url || "";
  return structured;
}
