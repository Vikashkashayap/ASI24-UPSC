# 🚀 Quick Test Guide - Student Profiler Agent

## ⚡ Fastest Way to Test (3 Steps)

### Step 1: Start Backend Server
```bash
cd Backend
npm start
# Server should run on http://localhost:5000
```

### Step 2: Get Your Auth Token
```bash
# Login via API (replace with your credentials)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

Copy the `token` from response.

### Step 3: Test the Agent
```bash
curl -X POST http://localhost:5000/api/agents/student-profiler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "targetYear": "2026",
    "dailyHours": 6,
    "weakSubjects": ["Polity", "Economy"],
    "examStage": "Prelims",
    "currentDate": "2024-01-15"
  }'
```

---

## 🧪 Using the Test Script

1. **Edit `test-student-profiler.js`** - Update EMAIL and PASSWORD
2. **Run the script:**
   ```bash
   cd Backend
   node test-student-profiler.js
   ```

---

## 📋 Request Format

```json
{
  "targetYear": "2026",           // String: Exam year
  "dailyHours": 6,                // Number: 1-16 hours
  "weakSubjects": ["Polity", "Economy"],  // Array of strings
  "examStage": "Prelims",         // "Prelims" | "Mains" | "Both"
  "currentDate": "2024-01-15"     // YYYY-MM-DD format
}
```

---

## ✅ Expected Response Structure

```json
{
  "success": true,
  "message": "Study plan generated successfully",
  "data": {
    "summary": { ... },
    "dailyPlan": [ ... ],      // 7 days
    "weeklyPlan": [ ... ],     // 4 weeks
    "revisionSchedule": [ ... ],
    "dynamicRules": [ ... ]
  }
}
```

---

## 🔍 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check your auth token is valid |
| 400 Validation Error | Verify all required fields are present and valid |
| 500 Server Error | Check OPENROUTER_API_KEY in .env file |
| CORS Error | Ensure backend CORS is configured for your frontend URL |

---

## 📚 More Details

- **Full Testing Guide**: See `TEST_STUDENT_PROFILER.md`
- **Frontend Usage**: See `Frontend/STUDENT_PROFILER_USAGE.md`
- **API Examples**: See `Backend/src/agents/studentProfilerExamples.json`

