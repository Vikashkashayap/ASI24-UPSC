# Student Profiler Agent - Frontend Usage Guide

## 📦 API Integration

The Student Profiler API is already integrated in `Frontend/src/services/api.ts`:

```typescript
import { studentProfilerAPI } from '../services/api';

// Generate a study plan
const response = await studentProfilerAPI.generatePlan({
  targetYear: '2026',
  dailyHours: 6,
  weakSubjects: ['Polity', 'Economy'],
  examStage: 'Prelims',
  currentDate: '2024-01-15',
});

const studyPlan = response.data.data; // The actual plan
```

---

## 🎨 React Component Example

Here's a complete example of how to use it in a React component:

```typescript
import { useState } from 'react';
import { studentProfilerAPI } from '../services/api';

interface StudyPlan {
  summary: {
    strategy: string;
    focusSubjects: string[];
    dailyLoadType: string;
  };
  dailyPlan: Array<{
    day: string;
    subject: string;
    topic: string;
    durationHours: number;
    activity: string;
  }>;
  weeklyPlan: Array<{
    week: string;
    primaryFocus: string[];
    revisionDays: string[];
    testDay: string;
  }>;
  revisionSchedule: Array<{
    topic: string;
    revisionDaysAfter: number[];
  }>;
  dynamicRules: string[];
}

export const StudyPlanGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    targetYear: '2026',
    dailyHours: 6,
    weakSubjects: ['Polity', 'Economy'],
    examStage: 'Prelims' as 'Prelims' | 'Mains' | 'Both',
    currentDate: new Date().toISOString().split('T')[0],
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await studentProfilerAPI.generatePlan(formData);
      
      if (response.data.success) {
        setPlan(response.data.data);
      } else {
        setError(response.data.message || 'Failed to generate plan');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Generate Study Plan</h1>
      
      {/* Form */}
      <div className="mb-6 space-y-4">
        <div>
          <label>Target Year</label>
          <input
            type="text"
            value={formData.targetYear}
            onChange={(e) => setFormData({ ...formData, targetYear: e.target.value })}
            className="border p-2 rounded"
          />
        </div>
        
        <div>
          <label>Daily Hours</label>
          <input
            type="number"
            value={formData.dailyHours}
            onChange={(e) => setFormData({ ...formData, dailyHours: parseInt(e.target.value) })}
            className="border p-2 rounded"
            min="1"
            max="16"
          />
        </div>
        
        <div>
          <label>Exam Stage</label>
          <select
            value={formData.examStage}
            onChange={(e) => setFormData({ ...formData, examStage: e.target.value as any })}
            className="border p-2 rounded"
          >
            <option value="Prelims">Prelims</option>
            <option value="Mains">Mains</option>
            <option value="Both">Both</option>
          </select>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Plan Display */}
      {plan && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Strategy</h2>
            <p>{plan.summary.strategy}</p>
            <p className="mt-2">
              <strong>Focus:</strong> {plan.summary.focusSubjects.join(', ')}
            </p>
            <p>
              <strong>Load Type:</strong> {plan.summary.dailyLoadType}
            </p>
          </div>

          {/* Daily Plan */}
          <div>
            <h2 className="text-xl font-bold mb-4">Daily Plan</h2>
            <div className="space-y-2">
              {plan.dailyPlan.map((day, idx) => (
                <div key={idx} className="border p-3 rounded">
                  <div className="font-semibold">{day.day}</div>
                  <div>{day.subject} - {day.topic}</div>
                  <div className="text-sm text-gray-600">
                    {day.durationHours}h • {day.activity}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Plan */}
          <div>
            <h2 className="text-xl font-bold mb-4">Weekly Plan</h2>
            <div className="space-y-2">
              {plan.weeklyPlan.map((week, idx) => (
                <div key={idx} className="border p-3 rounded">
                  <div className="font-semibold">{week.week}</div>
                  <div>Focus: {week.primaryFocus.join(', ')}</div>
                  <div>Revision: {week.revisionDays.join(', ')}</div>
                  <div>Test Day: {week.testDay}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Revision Schedule */}
          <div>
            <h2 className="text-xl font-bold mb-4">Revision Schedule</h2>
            <div className="space-y-2">
              {plan.revisionSchedule.map((rev, idx) => (
                <div key={idx} className="border p-3 rounded">
                  <div className="font-semibold">{rev.topic}</div>
                  <div className="text-sm">
                    Revise after: {rev.revisionDaysAfter.join(', ')} days
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🔗 Integration with Existing Pages

You can integrate this into your existing `PlannerPage.tsx`:

```typescript
// In PlannerPage.tsx
import { studentProfilerAPI } from '../services/api';

// Add state and function
const [studyPlan, setStudyPlan] = useState(null);

const generatePlan = async () => {
  try {
    const response = await studentProfilerAPI.generatePlan({
      targetYear: '2026',
      dailyHours: 6,
      weakSubjects: ['Polity', 'Economy'],
      examStage: 'Prelims',
      currentDate: new Date().toISOString().split('T')[0],
    });
    
    if (response.data.success) {
      setStudyPlan(response.data.data);
    }
  } catch (error) {
    console.error('Failed to generate plan:', error);
  }
};
```

---

## 📱 TypeScript Types

For better type safety, you can create a types file:

```typescript
// types/studyPlan.ts
export interface StudyPlanSummary {
  strategy: string;
  focusSubjects: string[];
  dailyLoadType: 'light' | 'moderate' | 'intensive';
}

export interface DailyPlanItem {
  day: string;
  subject: string;
  topic: string;
  durationHours: number;
  activity: 'Concept reading' | 'Notes' | 'PYQs' | 'Revision' | 'Test';
}

export interface WeeklyPlanItem {
  week: string;
  primaryFocus: string[];
  revisionDays: string[];
  testDay: string;
}

export interface RevisionScheduleItem {
  topic: string;
  revisionDaysAfter: [number, number, number]; // [3, 7, 21]
}

export interface StudyPlan {
  summary: StudyPlanSummary;
  dailyPlan: DailyPlanItem[];
  weeklyPlan: WeeklyPlanItem[];
  revisionSchedule: RevisionScheduleItem[];
  dynamicRules: string[];
}

export interface StudyPlanResponse {
  success: boolean;
  message: string;
  data: StudyPlan;
  metadata?: {
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    generatedAt: string;
  };
}
```

---

## 🎯 Quick Usage Checklist

- [ ] Import `studentProfilerAPI` from `../services/api`
- [ ] Create form with required fields (targetYear, dailyHours, weakSubjects, examStage, currentDate)
- [ ] Call `studentProfilerAPI.generatePlan()` with form data
- [ ] Handle loading and error states
- [ ] Display the generated plan (summary, dailyPlan, weeklyPlan, revisionSchedule)
- [ ] Add TypeScript types for better type safety

---

## 🚨 Error Handling

Always handle errors properly:

```typescript
try {
  const response = await studentProfilerAPI.generatePlan(formData);
  // Handle success
} catch (error: any) {
  if (error.response) {
    // API returned an error
    console.error('API Error:', error.response.data.message);
  } else if (error.request) {
    // Request was made but no response
    console.error('Network Error:', error.message);
  } else {
    // Something else happened
    console.error('Error:', error.message);
  }
}
```

