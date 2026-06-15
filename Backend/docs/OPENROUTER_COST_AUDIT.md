# OpenRouter / Gemini Cost Audit

**Goal:** Exam attempts = **0 AI tokens**. Translation only at question creation or one-time migration.

| File | Function | Why called | Removable during exam? |
|------|----------|------------|------------------------|
| `services/translateToHindi.js` | `translateToHindi` | Hindi string translation | **Yes** — blocked by `examAiGuard` + `DISABLE_RUNTIME_HINDI_TRANSLATION` |
| `services/translateToHindi.js` | `translateManyToHindi` | Batch per-string Hindi | **Yes** — same guards |
| `services/hindiBatchTranslate.js` | `translateTextsBatchToHindi` | Migration + practice gen batch Hindi | **Yes** during exam; allowed in migration batch context |
| `services/questionTranslationService.js` | `enrichQuestionWithHindi` | Runtime enrich (legacy) | **Yes** — not called from controllers; guarded |
| `services/questionTranslationService.js` | `enrichQuestionsWithHindi` | Batch enrich (legacy) | **Yes** — unused in routes |
| `services/bilingualMigrationService.js` | `translateQuestionHindiOnce` | One-time DB backfill | N/A — migration only |
| `services/testGenerationService.js` | `callOpenRouterTestGeneration` | MCQ generation (practice/mock) | **Yes** — only on `/generate*` routes (no `examAttemptGuard`) |
| `services/testGenerationService.js` | `batchTranslatePracticeQuestionsToHindi` | Hindi at admin practice gen | **Yes** during exam; runs once when test created |
| `services/openRouterService.js` | `callOpenRouterAPI` | Mentor, planner, chains, eval | **Yes** during exam |
| `services/openRouterService.js` | `callOpenRouterVisionAPI` | Copy evaluation (handwriting) | **Yes** during exam |
| `services/openRouterService.js` | `evaluateAnswerWithOpenRouter` | Mains answer scoring | **Yes** during exam |
| `services/aiService.js` | `checkNewsRelevance`, `generateStructuredAffair` | Current affairs cron/admin | **Yes** during exam |
| `services/advancedStudyPlannerService.js` | multiple | Study plan AI | **Yes** during exam |
| `services/visionCopyEvaluationService.js` | vision eval | Upload answer images | **Yes** during exam |
| `chains/upscStructureChain.js` | structure analysis | Copy structure feedback | **Yes** during exam |
| `agents/mentorAgent.js` | chat completion | Mentor chat | **Yes** during exam |
| `agents/studentProfilerAgent.js` | profiling | Student profile | **Yes** during exam |
| `agents/translatorAgent.js` | translation | General translator agent | **Yes** during exam |
| `agents/advancedCopyEvaluationAgent.js` | evaluation | Copy eval pipeline | **Yes** during exam |
| `controllers/currentAffairsController.js` | inline fetch | Admin CA generation | **Yes** during exam |

## Exam routes (zero AI)

Protected by `examAttemptGuard` → `assertOpenRouterAllowed` throws if any OpenRouter call occurs:

- `GET /api/tests/:id` — read bilingual fields from MongoDB
- `POST /api/tests/submit/:id`
- `POST /api/tests/assigned-practice/:id/start`
- `GET /api/tests/assigned-practice*`
- `POST /api/prelims-mock/:id/start`

## Expected cost reduction

| Flow | Before | After |
|------|--------|-------|
| 50Q practice attempt | ~40–50 translation calls | **0** |
| Language toggle | API per switch | **0** (localStorage + DB fields) |
| Question Hindi | Every read | **Once** (migration or generation) |

**Target: 80–95% OpenRouter reduction** if exam traffic was the main cost driver.

## One-time Hindi backfill

```bash
cd Backend
npm run migrate:bilingual:translate-once -- --dry-run
npm run migrate:bilingual:translate-once
npm run migrate:bilingual:translate-once -- --collection=AssignedPracticeTest
```

## Env safeguards

```env
DISABLE_RUNTIME_HINDI_TRANSLATION=true
PRACTICE_GEN_ENGLISH_ONLY=true
PRACTICE_GEN_BATCH_HINDI=true
```
