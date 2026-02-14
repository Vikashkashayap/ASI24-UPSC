# PDF-Based Scheduled Prelims Test – Production Notes

## Overview

This module adds **PDF-based scheduled Prelims tests** (test type: `PDF_BASED`) alongside the existing manual and AI Prelims tests. It does **not** modify the existing Test schema or AI test flow.

## Flow

### Admin

1. **Create test**  
   - Upload **Question Paper PDF** (UPSC format, bilingual Hindi + English).  
   - Upload **Solution PDF** (answer key).  
   - Set: **Test Title**, **Duration** (minutes), **Negative marking**, **Start time**, **End time**.

2. **Backend processing**  
   - Parse question PDF page-wise.  
   - Extract only valid MCQ blocks: question numbers **1–100**, exactly **4 options (a)(b)(c)(d)** per question.  
   - Separate Hindi vs English using `[\u0900-\u097F]` and merge by question number.  
   - Parse solution PDF with regex `/(\d+)\.\s*\(([a-d])\)/g` and map `correctAnswer` to each question.  
   - If fewer than **100** valid questions (or any missing answer key), the API returns an error and no test is created.

3. **Storage**  
   - New collection: **PrelimsPdfTest** (title, duration, negativeMarking, startTime, endTime, totalQuestions: 100, questions array with questionText { english, hindi }, options, correctAnswer, explanation).  
   - Student attempts: **PrelimsPdfTestAttempt** (userId, testId, answers, score, correctCount, wrongCount, isSubmitted, startedAt, submittedAt).

### Student

1. **List tests**  
   - GET `/api/prelims-pdf-tests` returns all PDF tests with **status**: `Upcoming` | `Live` | `Expired` (based on current time vs startTime/endTime).

2. **Start test**  
   - POST `/api/prelims-pdf-tests/:testId/start` is allowed only when  
     `currentTime >= startTime && currentTime <= endTime`.  
   - Creates (or resumes) a **PrelimsPdfTestAttempt**; response includes `attemptId`.

3. **Exam page**  
   - GET `/api/prelims-pdf-tests/attempt/:attemptId` returns the attempt and test **without** `correctAnswer`.  
   - Shows: question number, Hindi/English text, 4 options, timer (duration), question nav 1–100, submit.  
   - PATCH `/api/prelims-pdf-tests/attempt/:attemptId/answers` can be used to save answers during the test.

4. **Submit**  
   - POST `/api/prelims-pdf-tests/attempt/:attemptId/submit` validates answers server-side, computes  
     `score = correct × 2 − wrong × negativeMarking` (floored at 0), saves the attempt as submitted.

5. **Result**  
   - GET `/api/prelims-pdf-tests/attempt/:attemptId/result` returns: your answer, correct answer, explanation (if any), and final score.  
   - Correct answers are **only** exposed after submit via this result endpoint.

## Important Rules

- **Correct answers** are never sent before submit (only in the result after submit).  
- Only **questions 1–100** and blocks with **exactly 4 options (a)(b)(c)(d)** are accepted; other content is ignored.  
- If fewer than 100 valid MCQs (or missing answer key entries), creation **fails** with a clear error.  
- Existing **manual + AI** Prelims test behaviour and schema are **unchanged**.  
- New test type is **`PDF_BASED`**; routing and UI distinguish it from other test types.

## API Summary

| Method | Path | Who | Purpose |
|--------|------|-----|--------|
| POST | `/api/admin/prelims-pdf-tests` | Admin | Create test (multipart: questionPdf, solutionPdf; body: title, duration, negativeMarking, startTime, endTime) |
| GET | `/api/admin/prelims-pdf-tests` | Admin | List all PDF tests |
| GET | `/api/prelims-pdf-tests` | Student | List tests with status Upcoming/Live/Expired |
| POST | `/api/prelims-pdf-tests/:testId/start` | Student | Start test (only in time window) |
| GET | `/api/prelims-pdf-tests/attempt/:attemptId` | Student | Get attempt + questions (no correctAnswer) |
| PATCH | `/api/prelims-pdf-tests/attempt/:attemptId/answers` | Student | Save answers |
| POST | `/api/prelims-pdf-tests/attempt/:attemptId/submit` | Student | Submit and get score |
| GET | `/api/prelims-pdf-tests/attempt/:attemptId/result` | Student | Get result (with correct answers) |

## File Structure

- **Models**: `Backend/src/models/PrelimsPdfTest.js`, `Backend/src/models/PrelimsPdfTestAttempt.js`  
- **Service**: `Backend/src/services/prelimsPdfTestService.js` (parse question PDF, solution PDF, merge Hindi/English, map answers, validate 100 questions)  
- **Controller**: `Backend/src/controllers/prelimsPdfTestController.js`  
- **Routes**: Admin part in `Backend/src/routes/adminRoutes.js`; student part in `Backend/src/routes/prelimsPdfTestRoutes.js`  
- **Frontend**:  
  - Admin: `Frontend/src/pages/admin/AdminPrelimsPdfTestsPage.tsx`  
  - Student: `PrelimsPdfTestListPage.tsx`, `PrelimsPdfTestExamPage.tsx`, `PrelimsPdfResultPage.tsx`  
  - API: `Frontend/src/services/api.ts` (`prelimsPdfTestAPI`, `adminPrelimsPdfAPI`)

## Deployment

- Ensure **multer** is used for admin create (two files: `questionPdf`, `solutionPdf`).  
- PDF parsing uses existing **pdf-parse** and **splitTextIntoPages**; no new binary deps.  
- For production, consider rate-limiting create/list/start/submit and validating file size/content-type strictly.
