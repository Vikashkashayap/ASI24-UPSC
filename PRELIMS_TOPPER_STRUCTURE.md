# Prelims Topper Test - Folder Structure & Implementation

## Overview
Full-stack Prelims Topper Test system using React + Tailwind (Frontend), Node.js + Express (Backend), and MongoDB.

## Backend Structure

```
Backend/
├── src/
│   ├── models/
│   │   ├── PrelimsTest.js      # Test metadata (title, duration, startTime, endTime, isPublished)
│   │   ├── PrelimsQuestion.js  # Questions with English/Hindi, options, correctAnswer, explanation
│   │   └── PrelimsAttempt.js   # Student attempts (answers, score, accuracy)
│   ├── services/
│   │   └── prelimsPdfService.js # PDF parsing (question paper, answer key, explanation)
│   ├── controllers/
│   │   ├── prelimsTestController.js   # Admin: upload, CRUD, analytics
│   │   └── prelimsAttemptController.js # Student: get test, submit, result
│   └── routes/
│       └── prelimsTopperRoutes.js     # /api/prelims-topper/*
```

## Frontend Structure

```
Frontend/
├── src/
│   ├── pages/
│   │   └── prelimsTopper/
│   │       ├── PrelimsTopperPage.tsx           # Student: active tests list
│   │       ├── PrelimsTopperTestPage.tsx       # Student: exam UI (timer, nav, mark for review)
│   │       ├── PrelimsTopperResultPage.tsx     # Student: results (green/red/yellow, explanations)
│   │       ├── PrelimsTopperAdminPage.tsx      # Admin: upload PDFs, manage tests
│   │       └── PrelimsTopperAdminAnalyticsPage.tsx # Admin: analytics per test
│   └── services/
│       └── api.ts  # prelimsTopperAPI added
```

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/prelims-topper/active | Student | Get active tests (startTime ≤ now ≤ endTime) |
| GET | /api/prelims-topper/test/:id | Student | Get test questions (no answers) |
| POST | /api/prelims-topper/submit/:id | Student | Submit answers |
| GET | /api/prelims-topper/result/:testId | Student | Get result after submit |
| GET | /api/prelims-topper/my-attempts | Student | Get my attempts |
| GET | /api/prelims-topper/admin/tests | Admin | List all tests |
| POST | /api/prelims-topper/admin/upload | Admin | Upload PDFs and create test |
| PATCH | /api/prelims-topper/admin/tests/:id | Admin | Update test |
| DELETE | /api/prelims-topper/admin/tests/:id | Admin | Delete test |
| GET | /api/prelims-topper/admin/tests/:id/analytics | Admin | Get test analytics |

## MongoDB Collections

### PrelimsTest
```js
{ title, duration, startTime, endTime, isPublished, totalQuestions }
```

### PrelimsQuestion
```js
{ testId, questionNumber, questionText: { english, hindi }, options: { A, B, C, D: { english, hindi } }, correctAnswer, explanation: { english, hindi } }
```

### PrelimsAttempt
```js
{ studentId, testId, answers: { questionNumber: "A" }, score, correctCount, wrongCount, notAttempted, accuracy, submittedAt }
```

## PDF Format Expectations

- **Question Paper**: Numbered questions (1., 2., ...) with options (a), (b), (c), (d)
- **Answer Key**: Format `1. (c)` or `1 (c)`
- **Explanation**: Format `1. (c)\nExplanation text...`

## Scoring
UPSC Prelims: +2 for correct, -0.66 for wrong. Score = max(0, total).

## Frontend Routes

| Path | Component | Access |
|------|-----------|--------|
| /prelims-topper | PrelimsTopperPage | Student |
| /prelims-topper/test/:id | PrelimsTopperTestPage | Student |
| /prelims-topper/result/:id | PrelimsTopperResultPage | Student |
| /admin/prelims-topper | PrelimsTopperAdminPage | Admin |
| /admin/prelims-topper/analytics/:id | PrelimsTopperAdminAnalyticsPage | Admin |
