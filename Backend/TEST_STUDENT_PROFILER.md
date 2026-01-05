# Student Profiler Agent - Testing Guide

## 🚀 Quick Start

### Prerequisites
1. Backend server running on `http://localhost:5000`
2. OpenRouter API key configured in `.env` file
3. User authentication token (for protected routes)

---

## 📋 Testing Methods

### Method 1: Using cURL (Command Line)

#### Step 1: Get Authentication Token
First, login to get your JWT token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Copy the `token` from the response.

#### Step 2: Generate Study Plan
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

### Method 2: Using Postman / Thunder Client

1. **Create a new POST request**
   - URL: `http://localhost:5000/api/agents/student-profiler`
   - Method: `POST`

2. **Add Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

3. **Add Request Body (JSON):**
   ```json
   {
     "targetYear": "2026",
     "dailyHours": 6,
     "weakSubjects": ["Polity", "Economy"],
     "examStage": "Prelims",
     "currentDate": "2024-01-15"
   }
   ```

4. **Send Request**

---

### Method 3: Using Node.js Test Script

Create a file `test-student-profiler.js`:

```javascript
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const EMAIL = 'your-email@example.com';
const PASSWORD = 'your-password';

async function testStudentProfiler() {
  try {
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error('Login failed');
    }
    
    const token = loginData.token;
    console.log('✅ Login successful\n');

    // Step 2: Generate Study Plan
    console.log('📋 Generating study plan...');
    const planRes = await fetch(`${API_URL}/api/agents/student-profiler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetYear: '2026',
        dailyHours: 6,
        weakSubjects: ['Polity', 'Economy'],
        examStage: 'Prelims',
        currentDate: '2024-01-15',
      }),
    });

    const planData = await planRes.json();
    
    if (planData.success) {
      console.log('✅ Study plan generated successfully!\n');
      console.log('📊 Summary:', JSON.stringify(planData.data.summary, null, 2));
      console.log('\n📅 Daily Plan (first 3 days):');
      planData.data.dailyPlan.slice(0, 3).forEach(day => {
        console.log(`  ${day.day}: ${day.subject} - ${day.topic} (${day.durationHours}h)`);
      });
    } else {
      console.error('❌ Error:', planData.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStudentProfiler();
```

Run it:
```bash
node test-student-profiler.js
```

---

### Method 4: Using Frontend (React/TypeScript)

See the frontend integration in `Frontend/src/services/api.ts` and use it like:

```typescript
import { studentProfilerAPI } from '../services/api';

const generatePlan = async () => {
  try {
    const response = await studentProfilerAPI.generatePlan({
      targetYear: '2026',
      dailyHours: 6,
      weakSubjects: ['Polity', 'Economy'],
      examStage: 'Prelims',
      currentDate: '2024-01-15',
    });
    
    console.log('Study Plan:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📝 Request Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `targetYear` | string | ✅ Yes | Target exam year | `"2026"` |
| `dailyHours` | number | ✅ Yes | Daily study hours (1-16) | `6` |
| `weakSubjects` | string[] | ✅ Yes | Array of weak subjects | `["Polity", "Economy"]` |
| `examStage` | string | ✅ Yes | `"Prelims"`, `"Mains"`, or `"Both"` | `"Prelims"` |
| `currentDate` | string | ✅ Yes | Current date in YYYY-MM-DD format | `"2024-01-15"` |

---

## ✅ Expected Response

```json
{
  "success": true,
  "message": "Study plan generated successfully",
  "data": {
    "summary": {
      "strategy": "...",
      "focusSubjects": ["Polity", "Economy"],
      "dailyLoadType": "moderate"
    },
    "dailyPlan": [
      {
        "day": "Monday",
        "subject": "Polity",
        "topic": "Constitutional Framework",
        "durationHours": 2.5,
        "activity": "Concept reading"
      }
      // ... 7 days total
    ],
    "weeklyPlan": [
      {
        "week": "Week 1",
        "primaryFocus": ["Polity", "Economy"],
        "revisionDays": ["Wednesday", "Saturday"],
        "testDay": "Sunday"
      }
      // ... 4 weeks total
    ],
    "revisionSchedule": [
      {
        "topic": "Constitutional Framework",
        "revisionDaysAfter": [3, 7, 21]
      }
    ],
    "dynamicRules": [
      "If dailyHours decreases below 4, reduce topic load by 30%"
    ]
  },
  "metadata": {
    "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
    "usage": {
      "prompt_tokens": 450,
      "completion_tokens": 1200,
      "total_tokens": 1650
    },
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## ❌ Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed: dailyHours must be between 1 and 16 hours",
  "error": "Validation failed: dailyHours must be between 1 and 16 hours"
}
```

### Authentication Error
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Token required"
}
```

### API Error
```json
{
  "success": false,
  "message": "OPENROUTER_API_KEY is not configured",
  "error": "OPENROUTER_API_KEY is not configured"
}
```

---

## 🧪 Test Cases

### Test Case 1: Basic Request
```json
{
  "targetYear": "2026",
  "dailyHours": 6,
  "weakSubjects": ["Polity"],
  "examStage": "Prelims",
  "currentDate": "2024-01-15"
}
```

### Test Case 2: Multiple Weak Subjects
```json
{
  "targetYear": "2025",
  "dailyHours": 8,
  "weakSubjects": ["Polity", "Economy", "History"],
  "examStage": "Both",
  "currentDate": "2024-01-15"
}
```

### Test Case 3: Mains Focus
```json
{
  "targetYear": "2026",
  "dailyHours": 4,
  "weakSubjects": [],
  "examStage": "Mains",
  "currentDate": "2024-01-15"
}
```

### Test Case 4: Invalid Input (Should Fail)
```json
{
  "targetYear": "2020",  // Past year - invalid
  "dailyHours": 20,      // Too high - invalid
  "weakSubjects": "Polity",  // Not array - invalid
  "examStage": "Invalid",    // Invalid stage
  "currentDate": "invalid-date"  // Invalid format
}
```

---

## 🔍 Debugging Tips

1. **Check Server Logs**: Look for console logs in the backend terminal
2. **Verify API Key**: Ensure `OPENROUTER_API_KEY` is set in `.env`
3. **Check Token**: Make sure your JWT token is valid and not expired
4. **Network**: Verify backend is running on port 5000
5. **CORS**: If testing from browser, ensure CORS is configured correctly

---

## 📚 Next Steps

- Integrate with frontend UI
- Add study plan persistence to database
- Create revision reminders based on schedule
- Build dashboard to visualize the plan

