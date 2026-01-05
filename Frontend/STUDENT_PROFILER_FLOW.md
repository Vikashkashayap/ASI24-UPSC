# Student Profiler - Complete User Flow

## 📋 Overview

जब कोई student registration करता है, तो उसे automatically Student Profiler page पर redirect किया जाता है जहाँ वो अपनी study profile बना सकता है।

---

## 🔄 Complete Flow

### Step 1: Registration
1. User `/register` page पर जाता है
2. Name, Email, Password भरता है
3. "Create account" button click करता है
4. **After successful registration:**
   - Auth token save होता है
   - User automatically `/student-profiler` page पर redirect होता है

### Step 2: Student Profiler Form
User को एक form दिखता है जहाँ वो enter करता है:

- **Target Exam Year**: कौन सा साल में exam देना है (e.g., 2026)
- **Daily Study Hours**: रोज कितने घंटे पढ़ सकते हैं (1-16 hours)
- **Exam Stage**: 
  - Prelims Only
  - Mains Only  
  - Both Prelims & Mains
- **Weak Subjects**: Multiple select buttons से choose कर सकते हैं
  - Polity, Economy, History, Geography, Environment, Science & Tech, Ethics, Current Affairs
- **Start Date**: कब से शुरू करना है (date picker)

### Step 3: Generate Plan
1. User "Generate Study Plan" button click करता है
2. Loading state show होता है
3. Backend API call होता है: `POST /api/agents/student-profiler`
4. AI study plan generate करता है

### Step 4: View Plan
Plan generate होने के बाद user को दिखता है:

- **Strategy Overview**: Brief summary और focus areas
- **7-Day Study Schedule**: हर दिन का detailed plan
  - Day name (Monday-Sunday)
  - Subject
  - Topic
  - Duration (hours)
  - Activity type (Concept reading, Notes, PYQs, Revision, Test)
- **Weekly Structure**: 4 weeks का overview
  - Primary focus subjects
  - Revision days
  - Test day (Sunday)
- **Revision Schedule**: Spaced repetition (3, 7, 21 days)
- **Dynamic Rules**: Auto re-planning guidelines

### Step 5: Save & Continue
1. User "Save & Continue to Planner" button click करता है
2. `/planner` page पर redirect होता है
3. वहाँ से वो अपना plan देख सकता है

---

## 🎯 Key Features

### ✅ Registration Flow
- **File**: `Frontend/src/pages/auth/RegisterPage.tsx`
- Registration के बाद automatically `/student-profiler` पर redirect
- Auth token localStorage में save होता है

### ✅ Student Profiler Page
- **File**: `Frontend/src/pages/StudentProfilerPage.tsx`
- **Route**: `/student-profiler`
- Two-step flow: Form → Plan View
- Beautiful UI with dark theme
- Mobile responsive

### ✅ Planner Page Integration
- **File**: `Frontend/src/pages/PlannerPage.tsx`
- "Generate Study Plan" button add किया गया
- Existing users भी plan regenerate कर सकते हैं

---

## 📱 UI Components

### Form Page
```
┌─────────────────────────────────┐
│  Create Your Study Profile       │
│  ─────────────────────────────  │
│                                  │
│  Target Exam Year: [2026]        │
│  Daily Study Hours: [6]          │
│  Exam Stage: [Prelims ▼]        │
│                                  │
│  Weak Subjects:                  │
│  [Polity] [Economy] [History]   │
│  [Geography] [Environment] ...   │
│                                  │
│  Start Date: [2024-01-15]       │
│                                  │
│  [Generate Study Plan]           │
└─────────────────────────────────┘
```

### Plan View Page
```
┌─────────────────────────────────┐
│  Your Personalized Study Plan   │
│  ─────────────────────────────  │
│                                  │
│  📊 Strategy Overview           │
│  Focus: Polity, Economy         │
│  Load: moderate                  │
│                                  │
│  📅 7-Day Study Schedule        │
│  Monday: Polity - ... (2.5h)    │
│  Tuesday: Economy - ... (2h)    │
│  ...                            │
│                                  │
│  📆 Weekly Structure            │
│  Week 1: Focus on Polity...    │
│                                  │
│  🔄 Revision Schedule           │
│  Topic: ... → Revise after 3,7,21│
│                                  │
│  [Edit Profile] [Save & Continue]│
└─────────────────────────────────┘
```

---

## 🔧 Technical Details

### API Integration
- **Service**: `Frontend/src/services/api.ts`
- **Function**: `studentProfilerAPI.generatePlan()`
- **Endpoint**: `POST /api/agents/student-profiler`
- **Auth**: Required (Bearer token)

### Routes
- `/register` → Registration page
- `/student-profiler` → Student profiler form & plan view
- `/planner` → Planner page (with generate button)

### State Management
- Form data stored in component state
- Generated plan stored in component state
- Auth state managed by `useAuth` hook

---

## 🚀 How to Use

### For New Users
1. Go to `/register`
2. Fill registration form
3. Automatically redirected to `/student-profiler`
4. Fill study profile form
5. Click "Generate Study Plan"
6. View your personalized plan
7. Click "Save & Continue to Planner"

### For Existing Users
1. Go to `/planner` page
2. Click "Generate Study Plan" or "Regenerate Plan" button
3. Redirected to `/student-profiler`
4. Fill/update profile
5. Generate new plan

---

## 📝 Form Validation

- **Target Year**: Must be current year or future (max 5 years ahead)
- **Daily Hours**: Must be between 1-16
- **Exam Stage**: Must be one of: "Prelims", "Mains", "Both"
- **Weak Subjects**: Optional (can select multiple)
- **Start Date**: Must be valid date in YYYY-MM-DD format

---

## 🎨 UI/UX Features

- ✅ Dark theme with gradient background
- ✅ Mobile responsive design
- ✅ Loading states
- ✅ Error handling with user-friendly messages
- ✅ Two-step flow (Form → Plan)
- ✅ Easy navigation (Edit Profile, Save & Continue)
- ✅ Subject selection with visual feedback
- ✅ Beautiful card-based layout

---

## 🔐 Security

- Protected route (requires authentication)
- Auth token automatically included in API requests
- Redirects to login if not authenticated

---

## 📚 Next Steps (Future Enhancements)

- [ ] Save plan to database
- [ ] Allow users to edit saved plans
- [ ] Show plan history
- [ ] Add revision reminders
- [ ] Integrate with calendar
- [ ] Track plan completion
- [ ] Auto-update plan based on performance

