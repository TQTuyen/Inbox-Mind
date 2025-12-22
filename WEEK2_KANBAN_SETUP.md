# Week 2: Kanban Email Management with AI Summarization

This document provides setup instructions for the Week 2 Kanban-based email management system with AI-powered summarization features.

## 🎯 Features Implemented

### Feature I: Kanban Interface Visualization (25 points)

- ✅ Kanban board with 5 configurable columns (Inbox, To Do, In Progress, Done, Snoozed)
- ✅ Cards display real email data (Sender, Subject, Content snippet)
- ✅ Clean, organized Kanban-style layout with color-coded columns
- ✅ Email count badges per column
- ✅ Unread email highlighting

### Feature II: Drag-and-Drop Workflow Management (25 points)

- ✅ Drag cards between columns using @dnd-kit library
- ✅ Backend API updates email status on drop
- ✅ Optimistic UI updates (immediate visual feedback)
- ✅ Smooth animations and transitions
- ✅ Error handling with automatic revert on failure

### Feature III: Snooze/Deferral Mechanism (25 points)

- ✅ Snooze button on each card (visible on hover)
- ✅ Cards move to "Snoozed" column when snoozed
- ✅ Backend scheduled job checks every minute for expired snoozes
- ✅ Auto-restore to "Inbox" when snooze period expires
- ✅ Snooze duration display on cards

### Feature IV: AI Content Summarization (25 points)

- ✅ Google Gemini AI integration (free tier available)
- ✅ "Summarize with AI" button on cards (visible on hover)
- ✅ Real-time summary generation from email content
- ✅ Summaries cached in database for performance
- ✅ Summaries displayed in purple highlight boxes on cards
- ✅ Loading states and error handling

### Bonus Features

- ✅ Toggle button to switch between List view (Week 1) and Kanban view
- ✅ Click card to view full email details
- ✅ Mobile-responsive design
- ✅ Dark-themed UI matching existing design

## 📋 Prerequisites

- Node.js v20.18.0 or higher
- PostgreSQL 12+ running
- Google Gmail API credentials (from Week 1)
- **NEW:** Google Gemini API key (get free at [Google AI Studio](https://makersuite.google.com/app/apikey))

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd d:\DEV\AdvancedWeb\Inbox-Mind
npm install
```

New packages installed:

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - Drag and drop
- `@nestjs/schedule` - Scheduled jobs for snooze restoration
- `@google/generative-ai` - Google Gemini AI SDK

### Step 2: Database Migration

Run the migration to create the `email_metadata` table:

```bash
# Build the backend first
npm run be:build

# Run migration (if using TypeORM CLI)
# Or simply start the backend with synchronize:true in development
```

The migration creates:

- `email_metadata` table with columns:
  - `id` (UUID primary key)
  - `userId` (foreign key to users)
  - `emailId` (Gmail message ID)
  - `kanbanStatus` (inbox, todo, in_progress, done, snoozed)
  - `snoozeUntil` (timestamp for snooze expiry)
  - `summary` (AI-generated summary text)
  - `createdAt`, `updatedAt`

### Step 3: Backend Environment Configuration

Update `apps/backend/.env` with the new Gemini API key:

```env
# Existing variables from Week 1...
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=inbox_mind
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
ENCRYPTION_KEY=your_32_char_encryption_key

# NEW: Add this for AI summarization
GEMINI_API_KEY=your_gemini_api_key_here
```

**How to get a Gemini API Key:**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the key and paste it in your `.env` file

**Note:** The free tier of Gemini API provides 60 requests per minute, which is sufficient for testing and demo purposes.

### Step 4: Start the Application

Open two terminal windows:

**Terminal 1 - Backend:**

```bash
npm run be:run
```

**Terminal 2 - Frontend:**

```bash
npm run fe:run
```

The backend will start on `http://localhost:3000` and frontend on `http://localhost:5173`.

### Step 5: Verify the Setup

1. **Login**: Navigate to `http://localhost:5173` and log in with Google
2. **Check List View**: You should see your emails in the traditional list view
3. **Toggle to Kanban**: Click the grid icon (📊) in the top-right to switch to Kanban view
4. **Test Drag-and-Drop**: Drag an email card from "Inbox" to "To Do"
   - Card should move immediately (optimistic update)
   - Backend should persist the change
5. **Test Snooze**: Hover over a card and click "Snooze"
   - Card moves to "Snoozed" column
   - Snooze expiry time displays on the card
6. **Test AI Summary**: Hover over a card without a summary and click "Summarize with AI"
   - Loading spinner appears
   - AI-generated summary displays in purple box
   - Summary is cached for subsequent views

## 🏗️ Architecture Overview

### Frontend Structure

```
apps/frontend/src/features/mailbox/
├── components/
│   ├── KanbanBoard.tsx         # Main Kanban container with drag-and-drop
│   ├── KanbanCard.tsx          # Individual email card component
│   ├── EmailList.tsx           # Original list view (Week 1)
│   └── EmailDetail.tsx         # Email detail view
├── store/
│   └── emailStore.ts           # Zustand store (extended with kanban fields)
└── pages/
    └── MailboxPage.tsx         # Main page with view toggle

apps/frontend/src/services/api/
└── emailMetadataApi.ts         # API client for metadata operations
```

### Backend Structure

```
apps/backend/src/modules/
├── email-metadata/
│   ├── email-metadata.entity.ts       # EmailMetadata entity
│   ├── email-metadata.service.ts      # Business logic
│   ├── email-metadata.controller.ts   # API endpoints
│   ├── email-metadata.scheduler.ts    # Cron job for snooze restoration
│   └── dto/                           # Request/response DTOs
├── ai/
│   ├── ai.service.ts                  # Gemini AI integration
│   └── ai.module.ts                   # AI module
└── gmail/
    └── gmail.service.ts               # Gmail API (from Week 1)
```

### New API Endpoints

```
PUT    /api/email-metadata/:emailId/kanban-status  # Update email status
POST   /api/email-metadata/:emailId/snooze        # Snooze email
POST   /api/email-metadata/:emailId/unsnooze      # Unsnooze email
POST   /api/email-metadata/:emailId/generate-summary  # Generate AI summary
GET    /api/email-metadata/:emailId               # Get metadata
```

### Database Schema

**email_metadata Table:**

```sql
CREATE TABLE email_metadata (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  emailId VARCHAR(255),
  kanbanStatus VARCHAR(50) DEFAULT 'inbox',
  snoozeUntil TIMESTAMP NULL,
  summary TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, emailId)
);

CREATE INDEX idx_email_metadata_snooze_until ON email_metadata(snoozeUntil);
```

## 🧪 Testing Checklist

### Feature I: Kanban Interface

- [ ] Kanban view displays with 5 columns
- [ ] All emails appear in the "Inbox" column by default
- [ ] Each card shows sender name, subject, and preview
- [ ] Unread emails have blue left border
- [ ] Email count badges are accurate
- [ ] Starred emails show star icon

### Feature II: Drag-and-Drop

- [ ] Can drag cards between all columns
- [ ] Card position updates immediately (optimistic)
- [ ] Backend persists the status change
- [ ] Page refresh maintains the new status
- [ ] Network errors revert the optimistic update

### Feature III: Snooze

- [ ] "Snooze" button appears on card hover
- [ ] Clicking snooze moves card to "Snoozed" column
- [ ] Snooze duration (2 hours default) displays
- [ ] Wait 2 minutes, snooze should move back to inbox (for testing, modify the duration in code)
- [ ] Snoozed emails don't show snooze button

### Feature IV: AI Summarization

- [ ] "Summarize with AI" button appears on cards without summaries
- [ ] Clicking shows loading spinner
- [ ] AI-generated summary appears in purple box
- [ ] Summary is meaningful and concise
- [ ] Summary persists after page refresh
- [ ] Cards with summaries don't show the button

### General

- [ ] Toggle between list and Kanban views works
- [ ] Click card opens email detail view
- [ ] Mobile responsive (columns stack/scroll horizontally)
- [ ] All hover effects and animations work smoothly

## 🐛 Troubleshooting

### Issue: "AI service not available" error

**Solution:** Ensure `GEMINI_API_KEY` is set in `apps/backend/.env` and restart the backend server.

### Issue: Drag-and-drop not working

**Solution:** Check browser console for errors. Ensure `@dnd-kit` packages are installed correctly.

### Issue: Emails not appearing in Kanban view

**Solution:**

1. Check if emails load in list view first
2. Open browser console and check for errors
3. Verify backend is running and database is connected

### Issue: Snooze not auto-restoring

**Solution:**

1. Check backend logs for cron job execution
2. Verify `@nestjs/schedule` is installed
3. Check that `ScheduleModule.forRoot()` is in `app.module.ts`

### Issue: Database migration not running

**Solution:**

```bash
# Option 1: Use synchronize in development
# In app.module.ts, ensure synchronize: true

# Option 2: Manual migration
# Create the table manually using the SQL in the migration file
```

## 📝 Implementation Notes

### Why Gemini Instead of OpenAI?

- **Free tier**: Gemini offers 60 requests/minute for free
- **No credit card required**: Easy to get started
- **Fast**: Low latency for summarization tasks
- **Reliable**: Google's infrastructure

### Optimistic Updates

The UI updates immediately when dragging cards, providing instant feedback. If the backend request fails, the update is automatically reverted.

### Cron Job Frequency

The snooze restoration job runs every minute. For production, this could be adjusted based on business requirements.

### AI Summary Caching

Summaries are stored in the database to avoid regenerating them on every view, saving API costs and improving performance.

## 🎓 Grading Criteria Mapping

| Feature                  | Points  | Implementation                                       |
| ------------------------ | ------- | ---------------------------------------------------- |
| **I. Kanban Interface**  | 25      | KanbanBoard.tsx, KanbanCard.tsx with real email data |
| **II. Drag-and-Drop**    | 25      | @dnd-kit integration with backend API updates        |
| **III. Snooze**          | 25      | Snooze UI + Backend scheduler for auto-restore       |
| **IV. AI Summarization** | 25      | Gemini API + Database caching + UI display           |
| **Total**                | **100** | All features fully implemented                       |

## 🚀 Next Steps

1. Add custom snooze duration picker (1 hour, 4 hours, tomorrow, next week)
2. Implement bulk actions (select multiple cards, move all)
3. Add filters/search within Kanban view
4. Implement email priority scoring with AI
5. Add keyboard shortcuts for quick actions
6. Export Kanban board state as image/PDF

## 📚 Additional Resources

- [dnd-kit Documentation](https://docs.dndkit.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [NestJS Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- [React Query Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)

---

**Developed for Week 2 Advanced Web Project**
Last Updated: December 2025
