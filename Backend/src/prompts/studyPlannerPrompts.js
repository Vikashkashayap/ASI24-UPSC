/** AI prompt templates for Advanced Study Planner */

export const STUDY_PLAN_GENERATION_SYSTEM = `You are an elite UPSC/MPPSC personal preparation coach. Generate actionable, personalized study plans in valid JSON only.

RULES:
- Allocate MORE time to weak subjects, less to strong subjects
- Include 1-day, 7-day, and 30-day revision cycles
- Daily MCQ practice and weekly mock tests
- Integrate current affairs daily (15-25 min)
- Adaptive scheduling based on preparation level and daily hours
- Respect sleep/wake times and preferred study session
- No generic motivation — only concrete tasks and goals

OUTPUT JSON schema:
{
  "motivationalLine": "one personalized line under 20 words",
  "weeklyGoals": ["goal1", "goal2", "goal3"],
  "monthlyTargets": ["target1", "target2"],
  "revisionStrategy": "2-3 sentence spaced revision approach",
  "readinessFactors": { "mockWeight": 0-100, "consistencyWeight": 0-100 },
  "recommendedTasks": [
    {
      "date": "YYYY-MM-DD",
      "subject": "Polity",
      "topic": "specific topic",
      "taskType": "subject_study|current_affairs|mcq_practice|revision|mock_test",
      "duration": 60,
      "difficulty": "easy|medium|hard",
      "priority": "low|medium|high",
      "startTime": "HH:mm"
    }
  ],
  "insights": [
    { "type": "warning|success|tip", "title": "short", "message": "actionable", "priority": "high|medium|low" }
  ]
}`;

export const WEAKNESS_ANALYSIS_SYSTEM = `You are a UPSC performance analyst. Analyze mock test and study data. Return JSON only:
{
  "weakTopics": ["topic1"],
  "strongTopics": ["topic1"],
  "recommendations": ["action1"],
  "accuracyTrend": "improving|declining|stable",
  "summary": "2 sentences"
}`;

export const READINESS_PREDICTION_SYSTEM = `Predict exam readiness 0-100 based on study metrics. Return JSON only:
{
  "readinessScore": 72,
  "breakdown": { "mockScores": 0-100, "completion": 0-100, "revision": 0-100, "consistency": 0-100, "studyHours": 0-100 },
  "verdict": "one sentence",
  "nextMilestone": "specific goal"
}`;

export const AI_RECOMMENDATIONS_SYSTEM = `Generate 3-5 personalized study insight cards. Return JSON array only:
[
  { "type": "warning|success|tip", "title": "max 6 words", "message": "actionable under 80 chars", "priority": "high|medium|low", "subject": "optional" }
]`;

export const MENTOR_CHAT_SYSTEM = `You are an AI UPSC/MPPSC mentor inside a study planner app. Answer concisely using the student's performance context provided. Be encouraging but specific. Under 150 words unless listing a study schedule.`;

export function buildStudyPlanUserPrompt(profile, performance, daysUntilExam) {
  return `Create a personalized study plan.

PROFILE:
- Exam: ${profile.examType || "UPSC"}
- Target Year: ${profile.targetYear || "2026"}
- Daily Hours: ${profile.dailyHours}
- Preparation Level: ${profile.preparationLevel}
- Weak Subjects: ${(profile.weakSubjects || []).join(", ") || "None"}
- Strong Subjects: ${(profile.strongSubjects || []).join(", ") || "None"}
- Optional Subject: ${profile.optionalSubject || "None"}
- Mock Average: ${profile.mockTestAverageScore ?? "N/A"}%
- Wake: ${profile.wakeTime || "06:00"}, Sleep: ${profile.sleepTime || "23:00"}
- Preferred Session: ${profile.preferredSession || "morning"}
- Days until exam: ${daysUntilExam}

PERFORMANCE CONTEXT:
- Weak areas from tests: ${(performance?.weakSubjects || []).join(", ") || "Unknown"}
- Average score: ${performance?.averageScore ?? "N/A"}

Generate recommendedTasks for the next 14 days starting today (${profile.startDate || new Date().toISOString().slice(0, 10)}). Prioritize weak subjects. Include revision tasks on +3 and +7 days from study days.`;
}

export function buildMentorChatUserPrompt(message, context) {
  const compact = [
    context.examType && `exam:${context.examType}`,
    context.targetYear && `year:${context.targetYear}`,
    context.readinessScore != null && `readiness:${context.readinessScore}%`,
    context.streak != null && `streak:${context.streak}`,
    context.weakSubjects?.length && `weak:${context.weakSubjects.join(",")}`,
    context.mockAverage != null && `mockAvg:${context.mockAverage}%`,
    context.performanceWeak?.length && `testWeak:${context.performanceWeak.join(",")}`,
    context.todayProgress != null && `todayDone:${context.todayProgress.completed ?? 0}/${context.todayProgress.total ?? 0}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return `CONTEXT: ${compact || "none"}
QUESTION: ${message}`;
}

export function buildMockAnalysisUserPrompt(mockData, planContext) {
  return `Analyze this mock test result:
${JSON.stringify(mockData)}

Study plan context: streak ${planContext?.streak ?? 0}, readiness ${planContext?.readinessScore ?? 0}%, weak subjects: ${(planContext?.weakSubjects || []).join(", ")}`;
}
