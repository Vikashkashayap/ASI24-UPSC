/**
 * Pipeline timing / quality metrics for the admin health dashboard.
 */

const MAX_SAMPLES = 200;

const buckets = {
  retrievalMs: [],
  generationMs: [],
  verificationMs: [],
  explanationMs: [],
  factCheckMs: [],
  overallMs: [],
  confidence: [],
  similarity: [],
};

let counters = {
  questionsGenerated: 0,
  questionsRejected: 0,
  duplicatesSkipped: 0,
  regenerations: 0,
  cacheHits: 0,
};

function pushSample(arr, value) {
  if (typeof value !== "number" || Number.isNaN(value)) return;
  arr.push(value);
  if (arr.length > MAX_SAMPLES) arr.shift();
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function recordPipelineMetrics(sample = {}) {
  pushSample(buckets.retrievalMs, sample.retrievalMs);
  pushSample(buckets.generationMs, sample.generationMs);
  pushSample(buckets.verificationMs, sample.verificationMs);
  pushSample(buckets.explanationMs, sample.explanationMs);
  pushSample(buckets.factCheckMs, sample.factCheckMs);
  pushSample(buckets.overallMs, sample.overallMs);
  pushSample(buckets.confidence, sample.confidence);
  pushSample(buckets.similarity, sample.similarity);

  if (sample.questionsGenerated) counters.questionsGenerated += sample.questionsGenerated;
  if (sample.questionsRejected) counters.questionsRejected += sample.questionsRejected;
  if (sample.duplicatesSkipped) counters.duplicatesSkipped += sample.duplicatesSkipped;
  if (sample.regenerations) counters.regenerations += sample.regenerations;
  if (sample.cacheHits) counters.cacheHits += sample.cacheHits;
}

export function getQgMetricsSnapshot() {
  return {
    averages: {
      retrievalMs: avg(buckets.retrievalMs),
      generationMs: avg(buckets.generationMs),
      verificationMs: avg(buckets.verificationMs),
      explanationMs: avg(buckets.explanationMs),
      factCheckMs: avg(buckets.factCheckMs),
      overallMs: avg(buckets.overallMs),
      confidence: avg(buckets.confidence),
      similarity: avg(buckets.similarity),
    },
    samples: Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, v.length])
    ),
    counters: { ...counters },
  };
}

export function resetQgMetrics() {
  for (const k of Object.keys(buckets)) buckets[k] = [];
  counters = {
    questionsGenerated: 0,
    questionsRejected: 0,
    duplicatesSkipped: 0,
    regenerations: 0,
    cacheHits: 0,
  };
}

export default { recordPipelineMetrics, getQgMetricsSnapshot, resetQgMetrics };
