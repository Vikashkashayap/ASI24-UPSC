# Current Affairs API - Setup & Usage Guide

## ✅ Status: FIXED & WORKING

Your Current Affairs API is now fully operational! Here's what was done:

---

## 🔧 What Was Fixed

### Issue
- Empty current affairs list on frontend (`items: []`)
- No automatic data fetching

### Solution
1. **Enabled Auto-Cron**: Added `startCurrentAffairsCron()` to `server.js`
   - Now automatically runs at **6:00 AM daily** (Asia/Kolkata timezone)
   - Fetches articles from GNews API
   - Filters for UPSC relevance using AI
   - Saves structured content to database

2. **Created Test Script**: `Backend/test-current-affairs-api.js`
   - Verifies GNews API is working
   - Manually triggers the pipeline
   - Shows real-time results

---

## 📊 How It Works (Data Flow)

```
GNews API (20 articles/day)
        ↓
AI Relevance Filter (Claude checks UPSC relevance)
        ↓
Deduplication (check sourceUrl)
        ↓
Content Generation (AI structures: title, summary, keyPoints, GS paper, etc.)
        ↓
MongoDB (saved as "active" current affairs)
        ↓
Frontend (displays with filters)
```

---

## 🚀 Manual Trigger (If Needed)

```bash
cd Backend
node test-current-affairs-api.js
```

**Output**:
```
✅ GNews API working! Got X articles
✅ Admin login successful
✅ Pipeline triggered successfully!
  Fetched 10; published 5 (target 5-7), skipped 5.
✅ Found 5 current affairs
```

---

## 📱 Frontend Usage

**URL**: `http://localhost:5173/current-affairs`

**Features**:
- ✅ Default: Shows today's articles
- ✅ Filter by GS Paper (GS1, GS2, GS3, GS4)
- ✅ Filter by Difficulty (Easy, Moderate, Hard)
- ✅ Search by keyword
- ✅ Pagination (12 per page)
- ✅ Dark/Light mode

---

## 🔌 API Endpoints

### Public
- `GET /api/current-affairs` - List with pagination & filters
  - Query: `page=1`, `limit=12`, `gsPaper=GS1`, `difficulty=Moderate`, `search=keyword`
  
- `GET /api/current-affairs/:slug` - Get single article by slug

- `GET /api/current-affairs/mcqs/:id` - Generate 2 MCQs (premium feature)

### Admin Only
- `POST /api/admin/current-affairs/run-now` - Trigger pipeline manually
  - Requires: `Authorization: Bearer <admin_token>`

- `GET /api/admin/current-affairs/list` - List ALL articles (including inactive)

- `PATCH /api/current-affairs/:id` - Toggle active/inactive status

---

## ⚙️ Configuration

**File**: `Backend/.env`

**Required**:
```env
# GNews API
GNEWS_API_KEY=05ebe15e1073816aff4173aad6efe515

# AI Processing (for relevance + content generation)
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=anthropic/claude-3.5-sonnet

# Admin Auth (for manual triggers)
ADMIN_EMAIL=adminai@gmail.com
ADMIN_PASSWORD=adminai@#123
```

---

## 📅 Automatic Schedule

**Cron Job File**: `Backend/src/cron/currentAffairsCron.js`

- **Time**: 6:00 AM daily
- **Timezone**: Asia/Kolkata (changeable via `SCHEDULER_TIMEZONE` env var)
- **Action**: Runs `runCurrentAffairsPipeline()`
  - Fetches 20 articles
  - Publishes 5-7 relevant ones
  - Never deletes old records

---

## 🧪 Testing

1. **Test GNews API**:
   ```bash
   node test-current-affairs-api.js
   # Should show: "Got X articles"
   ```

2. **Check Database**:
   ```bash
   GET /api/current-affairs?limit=5
   # Should return active articles
   ```

3. **Frontend**:
   - Visit `http://localhost:5173/current-affairs`
   - Articles should be visible

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No articles showing | Run `node test-current-affairs-api.js` to manually trigger |
| GNews API error | Check `GNEWS_API_KEY` in `.env` |
| AI processing slow | Normal (Claude is processing articles) - may take 1-2 min |
| Cron not running | Check `Backend/src/server.js` has `startCurrentAffairsCron()` call |
| Articles all skipped | Some days have fewer relevant articles (skip 5-7, publish 5) |

---

## 💡 Example Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "title": "Supreme Court Reevaluates Bail Denial for Umar Khalid",
        "summary": "The Supreme Court of India...",
        "keyPoints": ["Point 1", "Point 2", ...],
        "gsPaper": "GS2",
        "difficulty": "Moderate",
        "keywords": ["Supreme Court", "Bail", ...],
        "date": "2026-05-19T00:00:00Z",
        "slug": "supreme-court-reevaluates-bail-denial-for-umar-khalid"
      },
      ...
    ],
    "total": 5,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  }
}
```

---

**✅ All systems operational! Current affairs will auto-update daily at 6 AM.**
