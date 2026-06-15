import crypto from "crypto";
import { getCheapModel } from "../config/openRouterModels.js";
import { openRouterChatCompletion } from "./openRouterClient.js";

const MODEL = () => getCheapModel();
const TEMPERATURE = 0.2;

const RELEVANCE_SYSTEM = "UPSC exam relevance checker. Reply YES or NO only.";
const RELEVANCE_QUESTION =
  "Is this news relevant for UPSC CSE prep (policy, SC, economy, environment, IR, S&T, defence, governance, social issues)? YES or NO only.\n\nNews:\n";

const SYSTEM_PROMPT = `UPSC current affairs analyst. Output strict JSON only:
{"title":"","summary":"~100 words","keyPoints":["x5"],"gsPaper":"GS1|GS2|GS3|GS4","prelimsFocus":"","mainsAngle":"","keywords":["x5"],"difficulty":"Easy|Moderate|Hard"}
Rules: 5 keyPoints, 5 keywords, exam-oriented summary. JSON only.`;

const relevanceCache = new Map();

/** Fast keyword pre-filter before LLM relevance check (saves ~30–50% CA pipeline calls). */
const UPSC_KEYWORD_RE =
  /\b(upsc|cse|india|indian|government|governance|supreme court|parliament|ministry|cabinet|policy|economy|gdp|inflation|constitutional|article\s+\d|lok sabha|rajya sabha|election|defence|defense|environment|climate|bilateral|geopolitic|scheme|budget|rbi|wto|healthcare|education|agriculture|gst|nuclear|space|isro|nato|un\b|imf|world bank|pib|g20|brics|asean|border|terrorism|cyber|digital|ai\b|startup|infrastructure|judiciary|bureaucracy|federalism|secularism|democracy|federal|state government|chief minister|prime minister|president of india)\b/i;

export function passesUpscKeywordFilter(article) {
  const text = [article.title, article.description, (article.content || "").slice(0, 600)]
    .filter(Boolean)
    .join(" ");
  return UPSC_KEYWORD_RE.test(text);
}

function articleCacheKey(article) {
  const text = [article.title, article.description, (article.content || "").slice(0, 500)].join("|");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 20);
}

/**
 * Check if a news article is UPSC-relevant using OpenRouter LLM.
 */
export async function isUpscRelevant(article) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment");
  }

  const key = articleCacheKey(article);
  if (relevanceCache.has(key)) return relevanceCache.get(key);

  const { title = "", description = "", content = "" } = article;
  const text = [title, description, (content || "").slice(0, 1200)].filter(Boolean).join("\n");
  const userContent = `${RELEVANCE_QUESTION}${text}`;

  const result = await openRouterChatCompletion({
    apiKey,
    model: MODEL(),
    messages: [
      { role: "system", content: RELEVANCE_SYSTEM },
      { role: "user", content: userContent },
    ],
    temperature: 0,
    maxTokens: 4,
    xTitle: "MentorsDaily - UPSC Relevance",
    cacheTtlSec: 86400,
    cacheKey: `relevance:${key}`,
    label: "ca-relevance",
  });

  const relevant = String(result.content || "").trim().toUpperCase().startsWith("YES");
  relevanceCache.set(key, relevant);
  return relevant;
}

function buildUserPrompt(article) {
  const { title = "", description = "", content = "", url = "" } = article;
  return `Analyze for UPSC:\nTitle: ${title}\nDescription: ${description}\nContent: ${content ? content.slice(0, 2000) : "(none)"}\nURL: ${url}\nJSON only.`;
}

function parseStructuredResponse(rawContent) {
  let content = (rawContent || "").trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];
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

export async function generateCurrentAffairFromNews(article, sourceUrl = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment");
  }

  const userPrompt = buildUserPrompt(article);
  const cacheKey = `ca-gen:${articleCacheKey(article)}`;

  const result = await openRouterChatCompletion({
    apiKey,
    model: MODEL(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: TEMPERATURE,
    maxTokens: 900,
    xTitle: "MentorsDaily - Current Affairs",
    cacheTtlSec: 604800,
    cacheKey,
    label: "ca-generate",
  });

  const rawContent = result.content?.trim();
  if (!rawContent) {
    throw new Error("Empty response from OpenRouter");
  }

  const structured = parseStructuredResponse(rawContent);
  structured.sourceUrl = sourceUrl || article.url || "";
  return structured;
}
