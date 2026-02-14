# Prelims PDF Upload - cURL Test Guide

Test karo ki PDF upload ke baad questions properly show ho rahe hain ya nahi.

---

## Prerequisites

- Backend running: `cd Backend && npm run dev` (port 5000)
- Admin credentials in `.env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Ek question PDF (format: 1. Question text (a) optA (b) optB (c) optC (d) optD)
- Optional: Answer key PDF

---

## Step 1: Login as Admin (Token lo)

```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}' | jq
```

**Response** se `token` copy karo. Example:
```json
{"user":{...},"token":"eyJhbGciOiJIUzI1NiIs..."}
```

Variable mein save karo:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Step 2: PDF Upload (Question PDF + optional Answer Key)

**Windows (PowerShell):**
```powershell
$TOKEN = "YOUR_TOKEN_HERE"
$pdfPath = "C:\path\to\your\question.pdf"

curl -X POST http://localhost:5000/api/admin/prelims-test/upload-pdf `
  -H "Authorization: Bearer $TOKEN" `
  -F "questionPdf=@$pdfPath" `
  -F "title=Prelims Test $(Get-Date -Format 'yyyy-MM-dd')" `
  -F "startTime=2025-02-14T00:00:00.000Z" `
  -F "endTime=2025-12-31T23:59:59.000Z" `
  -F "totalMarks=200" `
  -F "negativeMarking=0.66" `
  -F "durationMinutes=120"
```

**Linux/Mac (Bash):**
```bash
TOKEN="YOUR_TOKEN_HERE"
PDF_PATH="/path/to/your/question.pdf"

curl -s -X POST http://localhost:5000/api/admin/prelims-test/upload-pdf \
  -H "Authorization: Bearer $TOKEN" \
  -F "questionPdf=@$PDF_PATH" \
  -F "title=Prelims Test $(date +%Y-%m-%d)" \
  -F "startTime=2025-02-14T00:00:00.000Z" \
  -F "endTime=2025-12-31T23:59:59.000Z" \
  -F "totalMarks=200" \
  -F "negativeMarking=0.66" \
  -F "durationMinutes=120"
```

**Answer key ke saath:**
```bash
curl -s -X POST http://localhost:5000/api/admin/prelims-test/upload-pdf \
  -H "Authorization: Bearer $TOKEN" \
  -F "questionPdf=@/path/to/questions.pdf" \
  -F "answerKeyPdf=@/path/to/answerkey.pdf" \
  -F "title=Prelims Test" \
  -F "startTime=2025-02-14T00:00:00.000Z" \
  -F "endTime=2025-12-31T23:59:59.000Z"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Bilingual Prelims Topper Test created from PDF",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Prelims Test ...",
    "totalQuestions": 100,
    "questionsCount": 100,
    ...
  }
}
```

`_id` copy karo — ye test ID hai.

---

## Step 3: Student Token (Test start karne ke liye)

Student login karke token lo:
```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"STUDENT_EMAIL","password":"STUDENT_PASSWORD"}' | jq
```

---

## Step 4: Start Test — Questions Check karo

```bash
TEST_ID="507f1f77bcf86cd799439011"   # Step 2 se _id
STUDENT_TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -s -X POST "http://localhost:5000/api/student/prelims-test/start/$TEST_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Success Response** mein dekho:
- `data.test.questions` — array of questions (should have items)
- `data.test.hasBilingual` — true if questionHindi/questionEnglish
- Pehla question: `data.test.questions[0]`
  - `questionEnglish` — English text
  - `questionHindi` — Hindi text
  - `options` — [{ key, textEnglish, textHindi }, ...]

**Quick check (first question only):**
```bash
curl -s -X POST "http://localhost:5000/api/student/prelims-test/start/$TEST_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | jq '.data.test.questions[0]'
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Token sahi hai? Login dubara karo |
| 403 Forbidden | Admin route — admin user se login karo |
| 400 "No questions extracted" | PDF format check karo: `1. Question? (a) A (b) B (c) C (d) D` |
| questions empty | PDF text-based hona chahiye (selectable text); scanned hai toh OCR try karega |

---

## One-liner Test (Admin + Student same user agar admin bhi student ho)

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpass"}' | jq -r '.token')

# 2. Upload
RES=$(curl -s -X POST http://localhost:5000/api/admin/prelims-test/upload-pdf \
  -H "Authorization: Bearer $TOKEN" \
  -F "questionPdf=@./your-questions.pdf" \
  -F "title=Quick Test" \
  -F "startTime=2025-02-14T00:00:00.000Z" \
  -F "endTime=2025-12-31T23:59:59.000Z")

echo "$RES" | jq '.data._id, .data.questionsCount'

# 3. Start test (TEST_ID = above _id)
TEST_ID=$(echo "$RES" | jq -r '.data._id')
curl -s -X POST "http://localhost:5000/api/student/prelims-test/start/$TEST_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.test.questions[0].questionEnglish, .data.test.questions[0].options'
```
