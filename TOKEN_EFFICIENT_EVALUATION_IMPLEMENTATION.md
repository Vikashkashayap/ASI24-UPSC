# Token-Efficient UPSC Copy Evaluation System

## Overview

This implementation provides a **low-cost, token-optimized** UPSC Mains Answer Copy Evaluation system. The system processes a single PDF containing both Question and Answer, evaluates it using AI with minimal token usage, and provides interactive PDF highlighting with a side feedback panel.

## Architecture

### Backend Flow

1. **PDF Upload** → Single PDF with Question + Answer
2. **PDF Processing** → Extract text, detect Question vs Answer sections
3. **Token-Efficient Evaluation**:
   - Step 1: Generate compressed summary (300-400 tokens) using cheap model
   - Step 2: Evaluate summary + key excerpts (not full text)
   - Step 3: Return strict JSON with annotations
4. **Save Results** → Store evaluation with annotations for PDF highlighting

### Frontend Flow

1. **2-Column Layout**:
   - Left: PDF Viewer with highlighting
   - Right: Feedback Panel (sticky)
2. **PDF Highlighting** → Match annotations with PDF text layer
3. **Interactive Feedback** → Click highlights to see detailed feedback

## Token Optimization Strategy

### 1. Two-Step Evaluation Process

**Step 1: Summarization (Cheap Model)**
- Model: `openai/gpt-4o-mini` (cheapest)
- Input: Full answer text (compressed to 2000 chars)
- Output: 300-word summary + key points
- Token Usage: ~300 tokens

**Step 2: Evaluation (Cheap Model)**
- Model: `anthropic/claude-3-haiku` (cheaper than sonnet)
- Input: Summary + 3 key excerpts (600 chars total)
- Output: Structured JSON with annotations
- Token Usage: ~800 tokens

**Total Token Usage: ~1,100 tokens** (vs ~5,000+ for full-text evaluation)
**Cost Reduction: 70-80%**

### 2. Text Compression

- Remove extra whitespace
- Compress answer text to max 3000 chars before processing
- Use intelligent truncation at sentence boundaries

### 3. Selective Content Processing

- Only send summary + excerpts to evaluation model
- Never send full PDF text to LLM
- Preprocess and clean text before sending

## Key Components

### Backend

#### 1. `tokenEfficientEvaluationAgent.js`
- Two-step evaluation process
- Summary generation
- Token-optimized evaluation
- Returns strict JSON format

#### 2. `pdfProcessingService.js` (Updated)
- `detectQuestionAndAnswer()`: Detects Question vs Answer sections
- `compressText()`: Compresses text for token optimization
- Updated `processPDFForEvaluation()`: Single Q+A processing

#### 3. `copyEvaluationController.js` (Updated)
- Uses token-efficient agent
- Converts annotations to evaluation format
- Saves annotations for PDF highlighting

#### 4. `CopyEvaluation.js` (Model Updated)
- Added `annotationSchema` for PDF highlighting
- Supports annotations with:
  - `page`: Page number
  - `issue_type`: content | structure | language
  - `severity`: high | medium | low
  - `highlight_text`: Exact text to highlight
  - `comment`: What's wrong
  - `suggestion`: How to improve

### Frontend

#### 1. `PDFViewer.tsx`
- Renders PDF using `react-pdf` (pdf.js)
- Highlights text based on annotations
- Fuzzy text matching for highlight_text
- Interactive highlights (click to select)

#### 2. `FeedbackPanel.tsx`
- Sticky right panel
- Shows score, overall feedback
- Lists strengths, weaknesses
- Displays annotations with severity colors
- Click annotation to see details

#### 3. `CopyEvaluationDetailPageV2.tsx`
- 2-column layout (PDF + Feedback)
- Integrates PDFViewer and FeedbackPanel
- Handles annotation selection

## Data Flow

```
1. User uploads PDF (Question + Answer)
   ↓
2. Backend processes PDF:
   - Extract text
   - Detect Question (first 15-20%)
   - Detect Answer (remaining)
   - Compress answer text
   ↓
3. Token-Efficient Evaluation:
   - Generate summary (gpt-4o-mini, ~300 tokens)
   - Evaluate summary + excerpts (claude-3-haiku, ~800 tokens)
   - Return JSON with annotations
   ↓
4. Save to database:
   - Evaluation data
   - Annotations array
   ↓
5. Frontend displays:
   - PDF with highlights
   - Side panel with feedback
   - Click highlights → show details
```

## Annotation Format

```json
{
  "page": 2,
  "issue_type": "content | structure | language",
  "severity": "high | medium | low",
  "highlight_text": "exact text snippet from answer",
  "comment": "what is wrong (max 50 words)",
  "suggestion": "how to improve (max 50 words)"
}
```

## Cost Comparison

### Old System (Full-Text Evaluation)
- Model: `claude-3.5-sonnet`
- Input: Full answer text (~5000 tokens)
- Cost per evaluation: ~$0.15-0.25

### New System (Token-Efficient)
- Step 1: `gpt-4o-mini` summary (~300 tokens) = ~$0.001
- Step 2: `claude-3-haiku` evaluation (~800 tokens) = ~$0.01
- **Total cost: ~$0.011** (90% reduction)

## Usage

### Backend

The controller automatically uses token-efficient evaluation:

```javascript
// Automatically uses tokenEfficientEvaluationAgent
POST /api/copy-evaluation/upload
```

### Frontend

Use the new detail page:

```typescript
// Route to new detail page
<Route path="/copy-evaluation/:id" element={<CopyEvaluationDetailPageV2 />} />
```

## Configuration

### Environment Variables

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=anthropic/claude-3-haiku  # Cheaper model
```

### Model Selection

- **Summarization**: `openai/gpt-4o-mini` (hardcoded, cheapest)
- **Evaluation**: `anthropic/claude-3-haiku` (default) or set via env

## PDF Highlighting Algorithm

1. **Text Extraction**: PDF.js extracts text layer
2. **Fuzzy Matching**: Find `highlight_text` in PDF text spans
3. **Position Calculation**: Calculate bounding box for highlight
4. **Overlay Creation**: Create colored overlay div
5. **Interaction**: Click highlight → show feedback

## Future Optimizations

1. **Caching**: Cache summaries for similar answers
2. **Batch Processing**: Evaluate multiple PDFs in batch
3. **Progressive Loading**: Show summary first, then full evaluation
4. **Model Selection**: Auto-select cheapest model based on answer length

## Testing

### Test Token Usage

```javascript
// Check token usage in evaluation result
console.log(evaluationResult.tokenOptimized); // true
console.log(evaluationResult.summary); // Compressed summary
```

### Test PDF Highlighting

1. Upload PDF with known text
2. Check annotations have `highlight_text`
3. Verify highlights appear on PDF
4. Click highlight → feedback panel updates

## Notes

- **Single PDF Only**: System designed for one PDF with Q+A
- **Max Pages**: Configurable (default: no limit, but recommend 5-10)
- **Text Matching**: Uses fuzzy matching for robustness
- **Mobile Responsive**: 2-column layout collapses on mobile

## Files Modified/Created

### Backend
- ✅ `src/agents/tokenEfficientEvaluationAgent.js` (NEW)
- ✅ `src/services/pdfProcessingService.js` (UPDATED)
- ✅ `src/controllers/copyEvaluationController.js` (UPDATED)
- ✅ `src/models/CopyEvaluation.js` (UPDATED)
- ✅ `src/services/openRouterService.js` (UPDATED - added maxTokens param)

### Frontend
- ✅ `src/components/PDFViewer.tsx` (NEW)
- ✅ `src/components/FeedbackPanel.tsx` (NEW)
- ✅ `src/pages/CopyEvaluationDetailPageV2.tsx` (NEW)
- ✅ `src/index.css` (UPDATED - PDF highlighting styles)

## Next Steps

1. **Update Routes**: Add route for new detail page
2. **Test Integration**: Test full flow end-to-end
3. **Error Handling**: Add better error messages
4. **Performance**: Optimize PDF rendering for large files
5. **Accessibility**: Add keyboard navigation for highlights

