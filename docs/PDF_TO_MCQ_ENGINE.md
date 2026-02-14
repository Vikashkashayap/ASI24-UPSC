# PDF to MCQ Conversion Engine

Production-ready engine for converting Question Paper PDF + Answer Key PDF into structured MCQs stored in MongoDB. Supports text-based and scanned PDFs, OCR fallback (eng+hin), and bilingual (Hindi/English) content.

---

## Architecture Overview

```
Admin Upload (Question PDF + Answer Key PDF)
    ↓
mcqPdfConversionService.convertPdfToMcq()
    ├── extractTextFromPDF() [text-based]
    ├── extractTextWithOCR() [scanned fallback: 300 DPI, grayscale]
    ├── parseQuestionPdfText() [regex: /^\d+\./, /\([a-d]\)/]
    ├── separateHindiEnglish() [Unicode detection]
    ├── parseAnswerKeyPdfText()
    └── Map correctAnswer by question number
    ↓
PrelimsQuestion collection (MongoDB)
```

---

## 1. Parser Service

**File:** `Backend/src/services/mcqPdfConversionService.js`

### Regex Logic

| Pattern | Regex | Purpose |
|---------|-------|---------|
| Question numbers | `/^(?:Q\.?\s*)?(\d+)[.)\s\u0964\u0900-\u097F]*/im` | Match 1. 2. Q1. Q.1 |
| Question split | `/(?=^\s*(?:Q\.?\s*)?\d+[.)\s\u0900-\u097F]|^\s*\d+[.)\s])/gim` | Split text into question blocks |
| Options (a)(b)(c)(d) | `/\(([a-dA-D])\)\s*([\s\S]*?)(?=\([a-dA-D]\)|$)/gi` | Extract option text |
| Answer key | `/(\d+)[.)\s\-]+[\(]?([A-Da-d])[\)]?/g` | Parse 1. (A), 1-A, 1. A |

### Key Functions

- `convertPdfToMcq(questionPdfBuffer, answerKeyPdfBuffer)` — Main pipeline
- `parseQuestionPdfText(text)` — Parse questions from raw text
- `parseAnswerKeyPdfText(text, totalQuestions)` — Extract answer key
- `separateHindiEnglish(text)` — Split Hindi/English by Unicode detection

---

## 2. OCR Fallback Logic

**File:** `Backend/src/services/pdfProcessingService.js`

1. **Primary:** `extractTextFromPDF()` — Uses pdf-parse for text-based PDFs
2. **Fallback:** If no text or "image-only" error → `extractTextWithOCR()`
3. **OCR Pipeline:**
   - pdf-to-img with `scale: 4.17` (~300 DPI)
   - `preprocessImageForOCR()` — Grayscale + normalize (sharp)
   - Tesseract.js with `hin+eng` (fallback `eng` if Hindi unavailable)
   - Page-by-page processing, join with `\n\n`

---

## 3. MongoDB Schema

### PrelimsQuestion

```javascript
{
  testId: ObjectId,
  questionNumber: Number,
  questionHindi: String,
  questionEnglish: String,
  options: [
    { key: "A"|"B"|"C"|"D", textHindi: String, textEnglish: String }
  ],
  correctAnswer: "A"|"B"|"C"|"D"
}
// Index: { testId: 1, questionNumber: 1 } unique
```

### PrelimsTopperTest

```javascript
{
  title, totalQuestions, totalMarks, negativeMarking, durationMinutes,
  questionPdfUrl, solutionPdfUrl,
  answerKey: { "0": "A", "1": "B", ... },
  startTime, endTime, createdBy
}
```

### PrelimsTestAttempt

```javascript
{
  userId, testId, score, correctAnswers, wrongAnswers, skipped, accuracy,
  timeTaken, rank, answers: { "0": "A", ... }, allowedTimeSeconds, markForReview
}
// Index: { userId: 1, testId: 1 } unique (prevents multiple attempts)
```

---

## 4. API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/prelims-test/upload-pdf` | Admin | Upload Q PDF + Answer Key PDF, create test |
| POST | `/api/admin/prelims-test/create` | Admin | Create with optional PDFs |
| POST | `/api/admin/prelims-test/reparse/:id` | Admin | Re-parse question PDF |
| GET | `/api/student/prelims-tests` | Student | List tests |
| POST | `/api/student/prelims-test/start/:id` | Student | Start test (returns questions **without** correctAnswer) |
| POST | `/api/student/prelims-test/submit/:id` | Student | Submit answers, server computes score |
| GET | `/api/student/prelims-test/result/:attemptId` | Student | Result (no correct answers in payload) |

---

## 5. Backend Validation

- **Score:** `correct × marksPerQuestion - wrong × negativeMarking` (UPSC standard)
- **Rank:** Recalculated after each submit; sort by score DESC, timeTaken ASC
- **Multiple attempts:** Unique index `(userId, testId)` prevents duplicates
- **Correct answers:** Never sent before submission — `.select("-correctAnswer")` on questions

---

## 6. React UI Structure

### PrelimsTopperExamPage

```
┌─────────────────────────────────────────────────────────────┐
│ Title | Timer | Answered N/Total | Language: [EN|HI|Both]   │
│ [View Question PDF]                                          │
│ Progress bar                                                 │
├─────────────────────────────────────────────────────────────┤
│ Question N of Total          [Mark for Review]               │
│                                                              │
│ Question text (Hindi/English/Both based on toggle)           │
│                                                              │
│ ○ (a) Option A   ○ (b) Option B   ○ (c) Option C   ○ (d) D  │
│ [Skip]                                                       │
├─────────────────────────────────────────────────────────────┤
│ [Prev]  [1][2][3]...[N]  [Save & Next] [Next]               │
│                                    [Submit Test]             │
└─────────────────────────────────────────────────────────────┘
```

- **Timer:** Countdown; auto-submit on expiry
- **Navigation:** Grid of question numbers (answered=green, marked=amber)
- **Language toggle:** English | Hindi | Both (for bilingual tests)
- **Submit confirmation:** Modal before final submit

---

## 7. Error Handling Strategy

| Layer | Strategy |
|-------|----------|
| **PDF extraction** | Try pdf-parse → OCR fallback; throw `PDF_CORRUPTED`, `PDF_FORMAT_ERROR` |
| **Parser** | Return `{ success, questions, errors }`; fallback to `extractAndParseBilingualPdfs` |
| **Admin create** | 400 with `parseResult.error` or `parseResult.errors[0]` |
| **Student start** | 400 if outside time window; 404 if test not found |
| **Student submit** | 400 if no attempt; score computed server-side only |
| **Ranking** | Cursor + bulkWrite chunks for 10k+ attempts |

---

## 8. Scalability (10,000+ Students)

- **Rank calculation:** Cursor over attempts, bulkWrite in 1k chunks
- **Rank list:** Aggregation pipeline (no in-memory sort)
- **Indexes:** `{ userId, testId }`, `{ testId, score, timeTaken }`, `{ testId, questionNumber }`
- **PrelimsQuestion:** Separate collection for questions (not embedded in test)

---

## 9. AI Test Module (Unchanged)

- AI tests: `/api/tests/*` — unchanged
- Prelims Topper: `/api/admin/prelims-test/*`, `/api/student/prelims-test/*` — isolated
- Separate models: `Test` vs `PrelimsTopperTest`, `PrelimsTestAttempt`, `PrelimsQuestion`

---

## Dependencies

- `pdf-parse` — Text extraction
- `pdf-to-img` — PDF → images for OCR
- `tesseract.js` — OCR (eng + hin)
- `sharp` — Image preprocessing (grayscale, 300 DPI)
- `unidev` — Legacy Kruti Dev font conversion
