# Week 4 Features - Testing Guide

This guide provides step-by-step instructions for testing the three major features implemented in Week 4.

## Prerequisites

Before testing, ensure:

1. Backend is running: `npm run be:run`
2. Frontend is running: `npm run fe:run`
3. Database migrations have been executed
4. Gemini API key is configured in `.env`: `GEMINI_API_KEY=your_key_here`
5. PostgreSQL has pgvector extension enabled

## Feature I: Semantic Search Testing

### 1. Verify Database Setup

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

# Check if email_embeddings table exists
\dt email_embeddings

# Check if vector index exists
\di *embeddings*
```

Expected: You should see the `vector` extension and `email_embeddings` table with an IVFFlat index.

### 2. Generate Embeddings Manually

**API Endpoint Test:**

```bash
# POST to generate embeddings for specific emails
curl -X POST http://localhost:3000/api/email-metadata/embeddings/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailIds": ["email_id_1", "email_id_2", "email_id_3"]
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "generated": 3,
    "emailIds": ["email_id_1", "email_id_2", "email_id_3"]
  }
}
```

### 3. Test Semantic Search

**Step 1: Search for concept "invoice"**

```bash
curl -X GET "http://localhost:3000/api/email-metadata/search/semantic?query=invoice&limit=10&threshold=0.7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Behavior:**

- Returns emails about payments, billing, receipts, costs
- Results ordered by similarity score (highest first)
- Similarity scores between 0.7 and 1.0
- Related concepts matched even if exact word "invoice" doesn't appear

**Step 2: Test in UI**

1. Navigate to Inbox page
2. Type "invoice" in the search bar
3. Select a suggestion with the **Sparkles icon** (semantic type)
4. Click Search or press Enter

**Expected Result:**

- Loading indicator appears
- Results show emails conceptually related to invoices
- Emails might contain words like: payment, bill, receipt, cost, charge
- Results are semantically relevant, not just keyword matches

### 4. Check Embedding Statistics

```bash
curl -X GET http://localhost:3000/api/email-metadata/embeddings/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "total": 150,
    "userId": "user-uuid",
    "lastGenerated": "2025-12-23T10:30:00Z"
  }
}
```

### 5. Verify Background Scheduler

**Check logs for automatic embedding generation:**

```bash
# In backend terminal, watch for cron job execution (every 30 minutes)
# You should see logs like:
# [EmailEmbeddingsScheduler] Starting scheduled embedding generation
# [EmailEmbeddingsScheduler] Processing 50 emails for user: user-uuid
# [EmbeddingsService] Generated embedding for email: email_id
```

**Manual trigger (for testing):**

- Wait 30 minutes OR restart backend to trigger immediately
- Check database: `SELECT COUNT(*) FROM email_embeddings;`
- Count should increase after scheduler runs

---

## Feature II: Search Auto-Suggestions Testing

### 1. Verify Search History Table

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Check if search_history table exists
\dt search_history

# View recent searches
SELECT * FROM search_history ORDER BY "searchedAt" DESC LIMIT 10;
```

### 2. Test Auto-Suggestions API

```bash
# GET suggestions for query "mar"
curl -X GET "http://localhost:3000/api/search/suggestions?query=mar&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "suggestions": [
    {
      "text": "marketing emails",
      "type": "history",
      "metadata": { "searchedAt": "2025-12-23T09:00:00Z" }
    },
    {
      "text": "maria@example.com",
      "type": "contact",
      "metadata": { "email": "maria@example.com", "name": "Maria Garcia" }
    },
    {
      "text": "March report",
      "type": "keyword",
      "metadata": { "source": "subject" }
    },
    {
      "text": "marketplace discussion",
      "type": "semantic",
      "metadata": { "similarity": 0.85 }
    }
  ],
  "query": "mar"
}
```

### 3. Test Suggestions UI Flow

**Step 1: Type in Search Bar**

1. Go to Inbox page
2. Click on the search bar
3. Type at least 2 characters (e.g., "mar")

**Expected Behavior:**

- Dropdown popover appears below search bar
- Shows up to 5 suggestions
- Each suggestion has an icon:
  - 🧑 **User icon** - contact suggestions
  - # **Hash icon** - keyword suggestions
  - ✨ **Sparkles icon** - semantic suggestions
  - 🕐 **Clock icon** - search history

**Step 2: Keyboard Navigation**

1. Press **Arrow Down** - Highlights first suggestion
2. Press **Arrow Down** again - Highlights second suggestion
3. Press **Arrow Up** - Highlights first suggestion
4. Press **Escape** - Closes dropdown
5. Type again and press **Enter** on highlighted suggestion

**Expected Result:**

- Highlighted suggestion changes background color
- Enter key selects the highlighted suggestion
- Search executes with the selected query
- Query is saved to search history

**Step 3: Mouse Interaction**

1. Type in search bar
2. Hover over a suggestion - Highlights on hover
3. Click suggestion - Executes search

### 4. Verify Suggestion Types

**Test each suggestion type appears:**

**History Suggestions:**

- Search for "test query 1"
- Search for "test query 2"
- Type "test" - should see both queries as history suggestions

**Contact Suggestions:**

- Ensure you have emails from contacts
- Type first few letters of a sender's name
- Should see email addresses as suggestions

**Keyword Suggestions:**

- Type words that appear in email subjects
- Should see subject keywords as suggestions

**Semantic Suggestions:**

- Type a conceptual query (e.g., "meeting")
- Should see semantically related terms (conference, discussion, call)

### 5. Test Search History Persistence

```bash
# Save search history
curl -X POST http://localhost:3000/api/search/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "query": "test search" }'
```

**Verify in database:**

```sql
SELECT * FROM search_history WHERE query = 'test search';
```

**Expected:** Row exists with current timestamp.

---

## Feature III: Dynamic Kanban Configuration Testing

### 1. Verify Kanban Config Table

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Check if kanban_config table exists
\dt kanban_config

# View default columns (should be seeded for all users)
SELECT * FROM kanban_config ORDER BY "userId", position;
```

**Expected:** Each user should have 4 default columns:

- INBOX (position 0)
- TODO (position 1)
- IN_PROGRESS (position 2)
- DONE (position 3)

### 2. Test Kanban Config API

**Get user's Kanban configuration:**

```bash
curl -X GET http://localhost:3000/api/email-metadata/kanban/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "columns": [
    {
      "columnId": "INBOX",
      "title": "Inbox",
      "gmailLabelId": "INBOX",
      "position": 0,
      "color": null,
      "createdAt": "2025-12-23T08:00:00Z",
      "updatedAt": "2025-12-23T08:00:00Z"
    },
    {
      "columnId": "TODO",
      "title": "To Do",
      "gmailLabelId": "Label_TODO",
      "position": 1,
      "color": "#3b82f6",
      "createdAt": "2025-12-23T08:00:00Z",
      "updatedAt": "2025-12-23T08:00:00Z"
    }
    // ... more columns
  ]
}
```

### 3. Test Creating a New Column

**API Test:**

```bash
curl -X POST http://localhost:3000/api/email-metadata/kanban/config/columns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Urgent",
    "color": "#ef4444"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "columnId": "CUSTOM_1735000000000_abc123",
    "title": "Urgent",
    "gmailLabelId": "Label_XYZ",
    "position": 4,
    "color": "#ef4444",
    "createdAt": "2025-12-23T10:00:00Z",
    "updatedAt": "2025-12-23T10:00:00Z"
  }
}
```

**UI Test:**

1. Navigate to Kanban page
2. Click "Kanban Settings" button
3. Enter "Urgent" in "Create New Column" input
4. Click "Add" button

**Expected Behavior:**

- Loading spinner appears briefly
- New column appears in the "Existing Columns" list
- Toast notification: "Column created - Urgent has been added"
- New column appears on Kanban board immediately

### 4. Test Renaming a Column

**API Test:**

```bash
curl -X PUT http://localhost:3000/api/email-metadata/kanban/config/columns/TODO \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "To-Do List"
  }'
```

**UI Test:**

1. Open Kanban Settings
2. Click on the "To Do" column title
3. Input field appears with current title
4. Edit to "To-Do List"
5. Press Enter or click the green checkmark

**Expected Behavior:**

- Column title updates immediately (optimistic update)
- Toast notification: "Column updated - Column renamed to To-Do List"
- Column title on Kanban board updates
- If error occurs, reverts to original title

### 5. Test Deleting a Column

**API Test:**

```bash
curl -X DELETE http://localhost:3000/api/email-metadata/kanban/config/columns/CUSTOM_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**UI Test - Successful Delete:**

1. Open Kanban Settings
2. Click trash icon on "Urgent" column
3. Confirmation dialog appears: "Are you sure?"
4. Click "Delete" button

**Expected Behavior:**

- Confirmation dialog shows column name
- After confirmation, column disappears from list
- Toast notification: "Column deleted - Urgent has been removed"
- Column disappears from Kanban board
- Remaining columns auto-reorder

**UI Test - Prevent INBOX Deletion:**

1. Try to click trash icon on "Inbox" column
2. Button is disabled (grayed out)
3. Hover shows tooltip: "Cannot delete Inbox column"

### 6. Test Drag-and-Drop Reordering

**UI Test:**

1. Open Kanban Settings
2. Grab the grip handle (⋮⋮) on any column
3. Drag it to a new position
4. Release

**Expected Behavior:**

- Visual feedback while dragging (opacity changes)
- Other columns shift to make space
- On drop, columns reorder immediately (optimistic update)
- API call updates positions in background
- Kanban board column order updates to match

**API Test:**

```bash
curl -X POST http://localhost:3000/api/email-metadata/kanban/config/reorder \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "columnIds": ["TODO", "INBOX", "IN_PROGRESS", "DONE"]
  }'
```

**Verify in database:**

```sql
SELECT "columnId", title, position
FROM kanban_config
WHERE "userId" = 'your-user-id'
ORDER BY position;
```

Expected: Positions should match the order in columnIds array.

### 7. Test Gmail Label Synchronization

**Test Moving Email Between Columns:**

1. Navigate to Kanban board
2. Drag an email from "Inbox" to "To Do"
3. Check browser console logs

**Expected Logs:**

```
🔵 [BACKEND] updateKanbanStatus endpoint called: {
  userId: 'user-uuid',
  emailId: 'email-123',
  kanbanStatus: 'todo'
}
✅ [BACKEND] Metadata saved successfully
```

**Verify Gmail label was updated:**

```bash
# Check email labels via API
curl -X GET http://localhost:3000/api/gmail/emails/email-123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:** Email's labels should now include `Label_TODO` instead of `INBOX`.

### 8. Test Configuration Persistence

**Browser Test:**

1. Create a custom column "Review"
2. Reorder columns
3. Refresh the page (F5)

**Expected Behavior:**

- Custom column "Review" still exists
- Column order is preserved
- All columns load from database

**localStorage Check:**

- Open browser DevTools → Application → Local Storage
- Find key: `kanban-config-storage`
- Should contain cached column configuration

---

## Integration Testing Scenarios

### Scenario 1: End-to-End Semantic Search Flow

1. **Setup:** Ensure 10+ emails exist in inbox
2. **Generate Embeddings:** Wait for scheduler OR manually trigger
3. **Search:** Type "urgent meeting" in search bar
4. **Select Suggestion:** Choose a semantic suggestion (✨ icon)
5. **Verify Results:** Check emails are conceptually related to urgent meetings
6. **Check History:** Type "urgent" again - should see "urgent meeting" as history suggestion

**Success Criteria:**

- Embeddings generated without errors
- Semantic search returns relevant results
- Search history saved and appears in suggestions
- UI updates smoothly with loading states

### Scenario 2: Cross-Feature Test - Search + Kanban

1. **Search:** Find emails about "invoices" using semantic search
2. **Organize:** Drag a search result email to "To Do" column
3. **Verify:**
   - Email appears in "To Do" column
   - Gmail label updated to `Label_TODO`
   - Kanban status in database is `todo`
4. **Search Again:** Search for same query
5. **Check:** Email still appears in results (label change doesn't affect search)

### Scenario 3: Dynamic Kanban Workflow

1. **Create Column:** Add "Waiting for Response" column
2. **Move Email:** Drag email from "In Progress" to new column
3. **Rename Column:** Change to "Awaiting Reply"
4. **Verify Gmail:** Check Gmail label name updated
5. **Delete Column:** Remove the column
6. **Check:** Emails moved back to Inbox or remain in Gmail with old label

---

## Performance Testing

### 1. Embedding Generation Speed

**Test:** Generate embeddings for 100 emails

```bash
# Time the API call
time curl -X POST http://localhost:3000/api/email-metadata/embeddings/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "emailIds": [/* 100 email IDs */] }'
```

**Expected:**

- Batch size: 10 emails per batch
- Delay: 1 second between batches
- Total time: ~10 batches × 2s (1s API + 1s delay) = ~20 seconds

### 2. Semantic Search Performance

**Test:** Search with large result set

```bash
time curl -X GET "http://localhost:3000/api/email-metadata/search/semantic?query=email&limit=50&threshold=0.5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**

- Query execution time: < 500ms for 1000 emails
- IVFFlat index provides O(log n) search
- Results ordered by similarity

### 3. Auto-Suggestions Latency

**Test:** Measure suggestion response time

1. Open Network tab in DevTools
2. Type in search bar
3. Check `/api/search/suggestions` request timing

**Expected:**

- Response time: < 200ms
- 4 parallel data source fetches complete quickly
- Deduplication and merging adds minimal overhead

---

## Error Handling Testing

### 1. Test Missing Gemini API Key

```bash
# Temporarily remove GEMINI_API_KEY from .env
# Restart backend
# Attempt to generate embeddings
```

**Expected:**

- API returns 400 Bad Request
- Error message: "AI service not available. Please configure GEMINI_API_KEY."
- Semantic search endpoint returns same error

### 2. Test Network Failures

**Simulate Gmail API failure:**

1. Move email between columns
2. Disconnect internet mid-operation

**Expected:**

- UI shows error toast: "Failed to move email. Please try again."
- Email position reverts to original column (rollback)
- Console shows error log

### 3. Test Invalid Column Operations

**Try to delete INBOX column:**

```bash
curl -X DELETE http://localhost:3000/api/email-metadata/kanban/config/columns/INBOX \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected:**

- API returns 400 Bad Request
- Error message: "Cannot delete INBOX column"
- UI button is disabled

---

## Database Verification Checklist

After all tests, verify database state:

```sql
-- Check embeddings exist
SELECT COUNT(*) FROM email_embeddings;

-- Check embedding dimensions
SELECT LENGTH(embedding::text) FROM email_embeddings LIMIT 1;
-- Should be a large number (768-dimensional vector)

-- Check search history
SELECT COUNT(*), COUNT(DISTINCT query) FROM search_history;

-- Check kanban config
SELECT "userId", COUNT(*) as column_count
FROM kanban_config
GROUP BY "userId";

-- Check for orphaned data
SELECT * FROM kanban_config
WHERE "userId" NOT IN (SELECT id FROM users);
```

---

## Troubleshooting Guide

### Issue: Semantic search returns no results

**Diagnosis:**

```sql
-- Check if embeddings exist for user
SELECT COUNT(*) FROM email_embeddings WHERE "userId" = 'your-user-id';
```

**Solution:**

- If count = 0: Run embedding generation manually
- Check Gemini API key is valid
- Check email_embeddings table has vector column

### Issue: Auto-suggestions not appearing

**Diagnosis:**

1. Check browser console for errors
2. Verify API response: Network tab → `/api/search/suggestions`
3. Check query length >= 2 characters

**Solution:**

- Clear browser cache
- Check authorization token is valid
- Verify SearchBar component is using correct endpoint

### Issue: Column reordering not working

**Diagnosis:**

1. Check browser console for drag-and-drop errors
2. Verify dnd-kit is installed: `npm list @dnd-kit/core`
3. Check API response for reorder endpoint

**Solution:**

- Reinstall dnd-kit: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Clear React Query cache
- Check optimistic update logic in mutation

---

## Success Metrics

### Feature I: Semantic Search

- ✅ Embeddings generated for 100% of emails
- ✅ Semantic search returns conceptually relevant results
- ✅ Similarity scores between 0.7-1.0
- ✅ Background scheduler runs without errors

### Feature II: Auto-Suggestions

- ✅ All 4 suggestion types appear (contact, keyword, semantic, history)
- ✅ Keyboard navigation works (arrows, enter, escape)
- ✅ Search history persists across sessions
- ✅ Suggestions appear within 200ms

### Feature III: Dynamic Kanban

- ✅ Create/rename/delete columns works
- ✅ Drag-and-drop reordering functions
- ✅ Gmail labels sync correctly
- ✅ Configuration persists after page refresh
- ✅ INBOX column cannot be deleted

---

## Next Steps After Testing

1. **Fix any bugs found during testing**
2. **Optimize performance bottlenecks** (e.g., slow embedding generation)
3. **Add monitoring** for background jobs
4. **Document any edge cases** discovered
5. **Prepare for production deployment**

---

## Quick Test Commands

```bash
# Run all backend tests
npm run be:test

# Run all frontend tests
npm run fe:test

# Build for production
npm run build

# Verify database migrations
npm run typeorm migration:show
```
