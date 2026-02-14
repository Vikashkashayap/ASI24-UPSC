# Prelims Topper Test Module

## Overview

This module adds **manual scheduled tests** (testType: `MANUAL`) alongside the existing AI test system. The AI test system is **unchanged**; all new code is isolated.

---

## Folder Structure

```
Backend/
├── src/
│   ├── models/
│   │   ├── Test.js                    # unchanged (AI tests)
│   │   ├── PrelimsTopperTest.js       # NEW: manual test metadata
│   │   └── PrelimsTestAttempt.js      # NEW: user attempt + rank
│   ├── services/
│   │   └── prelimsRankingService.js   # NEW: rank recalculation + list
│   ├── controllers/
│   │   ├── prelimsTopperAdminController.js   # NEW: create, list, analytics, export
│   │   └── prelimsTopperStudentController.js # NEW: list, start, submit, result, rank, file
│   ├── routes/
│   │   └── prelimsTopperRoutes.js     # NEW: admin + student routes
│   └── server.js                      # mounts /api with prelimsTopperRoutes
├── uploads/
│   └── prelims-topper/                # PDFs (question, solution) – gitignored
└── .gitignore                         # includes uploads/

Frontend/
├── src/
│   ├── pages/
│   │   ├── PrelimsTopperListPage.tsx       # Student: list of tests
│   │   ├── PrelimsTopperExamPage.tsx      # Student: timer + answer sheet
│   │   ├── PrelimsTopperResultPage.tsx     # Student: score, rank, solution PDF
│   │   ├── PrelimsTopperRankPage.tsx       # Student: rank list
│   │   └── admin/
│   │       ├── PrelimsTopperAdminPage.tsx  # Admin: create + list
│   │       └── PrelimsTopperAnalyticsPage.tsx # Admin: analytics + CSV
│   ├── services/
│   │   └── api.ts                     # prelimsTopperAPI + prelimsTopperAdminAPI
│   ├── layouts/
│   │   └── DashboardLayout.tsx        # sidebar: Prelims Topper Test (student + admin)
│   └── App.tsx                        # routes for prelims-topper/*
```

---

## API Routes

| Method | Path | Who | Description |
|--------|------|-----|-------------|
| POST | `/api/admin/prelims-test/create` | Admin | Create test (FormData: title, totalQuestions, totalMarks, negativeMarking, durationMinutes, startTime, endTime, answerKey, questionPdf, solutionPdf) |
| GET | `/api/admin/prelims-test/list` | Admin | List all manual tests |
| GET | `/api/admin/prelims-test/analytics/:id` | Admin | Per-test analytics (attempts, avg, high, low, top 10, timeline) |
| GET | `/api/admin/prelims-test/rank-list/:id` | Admin | Full rank list |
| GET | `/api/admin/prelims-test/export/:id` | Admin | Download results CSV |
| GET | `/api/student/prelims-tests` | Student | List tests with status (Upcoming/Live/Expired) and attempt |
| POST | `/api/student/prelims-test/start/:id` | Student | Start test (validates time window, returns allowedTimeSeconds) |
| POST | `/api/student/prelims-test/submit/:id` | Student | Submit answers + timeTaken; server calculates score and rank |
| GET | `/api/student/prelims-test/history` | Student | My attempts |
| GET | `/api/student/prelims-test/result/:attemptId` | Student | Result + topper comparison + solution PDF link |
| GET | `/api/student/prelims-test/rank/:id` | Student | Rank list for test |
| GET | `/api/student/prelims-test/file/:testId/:type` | Student | Serve question or solution PDF (auth required) |

---

## Security (server-side)

- **Time checks**: Start and submit validate `now` against `startTime` and `endTime`; reject if not in window.
- **Allowed time**: `allowedTimeSeconds = MIN(durationMinutes*60, remainingUntilEnd)`; enforced at start and used for timer.
- **Score**: Computed only on server from `answerKey` and request `answers`; no trust of client score.
- **Rank**: Recalculated after every submission via `recalculateRanksForTest(testId)` (sort by score desc, then timeTaken asc).
- **One attempt per user per test**: Unique index on `(userId, testId)` in `PrelimsTestAttempt`.

---

## Production Notes

1. **Uploads**: PDFs are stored under `Backend/uploads/prelims-topper/`. For production, consider moving to S3 or similar and storing URLs in the DB; keep serving behind auth.
2. **Scaling**: Rank list uses in-memory sort over attempts; for very large attempts per test (e.g. 10k+), consider an aggregation pipeline or materialized rank collection.
3. **Answer key**: Admin must provide `answerKey` as JSON (e.g. `{"0":"A","1":"B"}`) when creating the test so the server can score.
4. **Existing AI tests**: All existing routes and `Test` model remain as-is; Prelims Topper uses separate models and routes.
