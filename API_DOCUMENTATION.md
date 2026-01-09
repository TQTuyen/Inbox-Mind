# API Documentation - Inbox Mind

**Base URL:** `http://localhost:3000/api/v1`
**Production URL:** `https://your-backend-domain.com/api/v1`

---

## Table of Contents
1. [Authentication](#authentication)
2. [Gmail & Email Operations](#gmail--email-operations)
3. [Email Metadata & Kanban](#email-metadata--kanban)
4. [Search Features](#search-features)
5. [AI Features](#ai-features)

---

## Authentication

### 1. Google OAuth Login
Initiates Google OAuth2 authentication flow.

```http
GET /auth/google
```

**Response:** Redirects to Google OAuth consent screen

---

### 2. Google OAuth Callback
Handles OAuth2 callback and exchanges code for tokens.

```http
GET /auth/google/callback?code={authCode}
```

**Parameters:**
- `code` (query): Authorization code from Google

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

**Sets Cookie:** `refreshToken` (HttpOnly, Secure)

---

### 3. Refresh Access Token
Refreshes expired access token using refresh token cookie.

```http
POST /auth/refresh
```

**Headers:**
- `Cookie: refreshToken=...` (automatic)

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 4. Logout
Logs out user and clears all tokens.

```http
POST /auth/logout
```

**Headers:**
- `Authorization: Bearer {accessToken}`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Gmail & Email Operations

All endpoints require `Authorization: Bearer {accessToken}` header.

### 1. List Mailboxes/Labels
Get all Gmail labels/folders for current user.

```http
GET /gmail/mailboxes
```

**Response:**
```json
{
  "mailboxes": [
    {
      "id": "INBOX",
      "name": "Inbox",
      "type": "system",
      "messagesTotal": 150,
      "messagesUnread": 12
    },
    {
      "id": "Label_1234",
      "name": "Work",
      "type": "user"
    }
  ]
}
```

---

### 2. List Emails in Mailbox
Get paginated list of emails from a specific mailbox.

```http
GET /gmail/mailboxes/:mailboxId/emails?maxResults=50&pageToken=...
```

**Parameters:**
- `mailboxId` (path): Gmail label ID (e.g., "INBOX", "SENT")
- `maxResults` (query, optional): Number of emails per page (default: 50)
- `pageToken` (query, optional): Token for pagination

**Response:**
```json
{
  "emails": [
    {
      "id": "18c1f2e3a4b5c6d7",
      "threadId": "18c1f2e3a4b5c6d7",
      "subject": "Meeting Tomorrow",
      "from": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "to": [{
        "name": "Jane Smith",
        "email": "jane@example.com"
      }],
      "preview": "Hi Jane, let's discuss the project...",
      "timestamp": "2024-12-24T10:30:00Z",
      "isRead": false,
      "isStarred": false,
      "labelIds": ["INBOX", "IMPORTANT"],
      "attachments": [],
      "kanbanStatus": "inbox",
      "snoozeUntil": null,
      "summary": null
    }
  ],
  "nextPageToken": "CAAQ..."
}
```

---

### 3. Get Email Detail
Get full email content by ID.

```http
GET /gmail/emails/:emailId
```

**Response:**
```json
{
  "id": "18c1f2e3a4b5c6d7",
  "subject": "Meeting Tomorrow",
  "from": { "name": "John Doe", "email": "john@example.com" },
  "to": [...],
  "cc": [...],
  "body": "<html>Full HTML email body...</html>",
  "timestamp": "2024-12-24T10:30:00Z",
  "isRead": true,
  "attachments": [
    {
      "id": "att_123",
      "name": "document.pdf",
      "mimeType": "application/pdf",
      "size": 524288
    }
  ]
}
```

---

### 4. Mark Email as Read/Unread
Toggle email read status.

```http
POST /gmail/emails/:emailId/mark-read
```

**Request Body:**
```json
{
  "read": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email marked as read"
}
```

---

### 5. Delete Email
Move email to trash.

```http
DELETE /gmail/emails/:emailId
```

**Response:**
```json
{
  "success": true,
  "message": "Email deleted"
}
```

---

### 6. Send Email
Compose and send a new email.

```http
POST /gmail/emails/send
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "Email content here",
  "cc": "cc@example.com",
  "bcc": "bcc@example.com"
}
```

**Response:**
```json
{
  "id": "sent_email_id",
  "threadId": "thread_id",
  "message": "Email sent successfully"
}
```

---

### 7. Reply to Email
Reply to an existing email.

```http
POST /gmail/emails/:emailId/reply
```

**Request Body:**
```json
{
  "body": "Thank you for your email...",
  "to": "original-sender@example.com"
}
```

---

### 8. Get Email Attachment
Download email attachment.

```http
GET /gmail/emails/:emailId/attachments/:attachmentId
```

**Response:** Binary file stream with appropriate Content-Type header

---

## Email Metadata & Kanban

### 1. Get Kanban Emails
Get all emails with Kanban metadata.

```http
GET /email-metadata/kanban/emails
```

**Response:**
```json
{
  "emails": [
    {
      "id": "email_id",
      "subject": "Project Update",
      "from": {...},
      "kanbanStatus": "in_progress",
      "snoozeUntil": null,
      "summary": "Discussing Q4 objectives and deliverables",
      "note": "Follow up next week"
    }
  ]
}
```

---

### 2. Update Kanban Status
Move email to different Kanban column.

```http
PUT /email-metadata/:emailId/kanban-status
```

**Request Body:**
```json
{
  "kanbanStatus": "done"
}
```

**Response:**
```json
{
  "id": "metadata_id",
  "emailId": "email_id",
  "kanbanStatus": "done",
  "updatedAt": "2024-12-24T10:30:00Z"
}
```

---

### 3. Snooze Email
Temporarily hide email until specified time.

```http
POST /email-metadata/:emailId/snooze
```

**Request Body:**
```json
{
  "snoozeUntil": "2024-12-25T09:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "snoozeUntil": "2024-12-25T09:00:00Z"
}
```

---

### 4. Generate AI Summary
Generate AI-powered summary for email.

```http
POST /email-metadata/:emailId/generate-summary
```

**Response:**
```json
{
  "summary": "Meeting scheduled for tomorrow at 2 PM to discuss project milestones and Q4 deliverables."
}
```

---

### 5. Get Kanban Configuration
Get user's custom Kanban column configuration.

```http
GET /email-metadata/kanban/config
```

**Response:**
```json
{
  "columns": [
    {
      "id": "col_1",
      "columnId": "inbox",
      "name": "Inbox",
      "color": "#3b82f6",
      "position": 0,
      "gmailLabelId": "INBOX"
    },
    {
      "id": "col_2",
      "columnId": "todo",
      "name": "To Do",
      "color": "#f59e0b",
      "position": 1,
      "gmailLabelId": "Label_TODO"
    }
  ]
}
```

---

### 6. Create Kanban Column
Add new custom Kanban column.

```http
POST /email-metadata/kanban/columns
```

**Request Body:**
```json
{
  "name": "Urgent",
  "color": "#ef4444",
  "gmailLabelId": "Label_URGENT"
}
```

---

### 7. Update Kanban Column
Modify existing column.

```http
PUT /email-metadata/kanban/columns/:columnId
```

**Request Body:**
```json
{
  "name": "High Priority",
  "color": "#dc2626"
}
```

---

### 8. Delete Kanban Column
Remove custom column.

```http
DELETE /email-metadata/kanban/columns/:columnId
```

---

### 9. Reorder Kanban Columns
Change column display order.

```http
PUT /email-metadata/kanban/reorder
```

**Request Body:**
```json
{
  "columnIds": ["col_1", "col_3", "col_2", "col_4"]
}
```

---

## Search Features

### 1. Fuzzy Search
Search emails with typo tolerance and partial matching.

```http
POST /gmail/search/fuzzy
```

**Request Body:**
```json
{
  "query": "marketng report",
  "mailboxId": "INBOX",
  "limit": 20
}
```

**Response:**
```json
{
  "results": [
    {
      "emailId": "email_123",
      "subject": "Marketing Report Q4",
      "from": {...},
      "snippet": "Here's the marketing report...",
      "score": 0.95,
      "timestamp": "2024-12-24T10:00:00Z",
      "isRead": true,
      "hasAttachments": false
    }
  ],
  "query": "marketng report",
  "totalResults": 5
}
```

---

### 2. Semantic Search
Search emails by conceptual meaning using AI embeddings.

```http
POST /email-metadata/semantic-search
```

**Request Body:**
```json
{
  "query": "financial documents and invoices",
  "limit": 10,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "emailId": "email_456",
      "subject": "Invoice #12345",
      "from": {...},
      "snippet": "Please find attached invoice...",
      "similarity": 0.89,
      "timestamp": "2024-12-20T14:30:00Z"
    },
    {
      "emailId": "email_789",
      "subject": "Q4 Budget Report",
      "from": {...},
      "snippet": "Annual financial summary...",
      "similarity": 0.85,
      "timestamp": "2024-12-18T09:15:00Z"
    }
  ]
}
```

---

### 3. Search Auto-Suggestions
Get search suggestions from multiple sources while typing.

```http
GET /gmail/search/suggestions?query=john&limit=5
```

**Parameters:**
- `query` (query): Partial search query (min 2 chars)
- `limit` (query, optional): Max suggestions (default: 5)

**Response:**
```json
{
  "suggestions": [
    {
      "text": "John Doe",
      "type": "contact",
      "metadata": {
        "email": "john.doe@example.com",
        "name": "John Doe"
      }
    },
    {
      "text": "john smith meeting",
      "type": "history",
      "metadata": {
        "searchedAt": "2024-12-23T15:20:00Z"
      }
    },
    {
      "text": "Johnson Project",
      "type": "keyword",
      "metadata": {}
    }
  ]
}
```

**Suggestion Types:**
- `history`: From user's search history
- `contact`: From recent email contacts
- `keyword`: From email subject keywords
- `semantic`: From semantic search results

---

## AI Features

### 1. Generate Email Embeddings
Generate vector embeddings for emails (batch processing).

```http
POST /email-metadata/generate-embeddings
```

**Request Body:**
```json
{
  "emailIds": ["email_1", "email_2", "email_3"],
  "forceRegenerate": false
}
```

**Response:**
```json
{
  "generated": 3,
  "skipped": 0,
  "total": 3,
  "embeddings": [
    {
      "emailId": "email_1",
      "dimension": 768,
      "createdAt": "2024-12-24T10:30:00Z"
    }
  ]
}
```

---

## Error Responses

All API endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or expired token"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["email must be a valid email"],
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Email not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Gmail API error: ..."
}
```

---

## Rate Limiting

- Gmail API: 250 queries per second per user
- Backend API: No explicit rate limit (relies on Gmail API limits)

---

## Authentication Flow

1. **Initial Login:**
   ```
   User → GET /auth/google → Google OAuth → Callback
   → Backend exchanges code for tokens
   → Returns accessToken + sets refreshToken cookie
   ```

2. **Authenticated Requests:**
   ```
   Client → API Request with Bearer token
   → If 401: Refresh token
   → Retry original request
   ```

3. **Token Refresh:**
   ```
   Client → POST /auth/refresh (with cookie)
   → Backend validates refresh token
   → Returns new accessToken
   ```

4. **Logout:**
   ```
   Client → POST /auth/logout
   → Backend clears refresh token
   → Client clears accessToken from memory
   ```

---

## Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  name VARCHAR,
  picture VARCHAR,
  googleAccessToken TEXT ENCRYPTED,
  googleRefreshToken TEXT ENCRYPTED,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
)
```

### Email Metadata Table
```sql
email_metadata (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  emailId VARCHAR,
  kanbanStatus VARCHAR,
  snoozeUntil TIMESTAMP,
  summary TEXT,
  note TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  UNIQUE(userId, emailId)
)
```

### Email Embeddings Table
```sql
email_embeddings (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  emailId VARCHAR,
  embedding VECTOR(768), -- pgvector
  createdAt TIMESTAMP,
  UNIQUE(userId, emailId)
)
```

### Kanban Config Table
```sql
kanban_config (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  columnId VARCHAR,
  name VARCHAR,
  color VARCHAR,
  position INTEGER,
  gmailLabelId VARCHAR,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  UNIQUE(userId, columnId)
)
```

### Search History Table
```sql
search_history (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  query VARCHAR,
  searchType VARCHAR, -- 'fuzzy' or 'semantic'
  createdAt TIMESTAMP
)
```

---

## Postman Collection

Import this into Postman for easy API testing:

```json
{
  "info": {
    "name": "Inbox Mind API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login with Google",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/auth/google"
          }
        },
        {
          "name": "Refresh Token",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/refresh"
          }
        },
        {
          "name": "Logout",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/logout",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ]
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "accessToken",
      "value": ""
    }
  ]
}
```

---

**Last Updated:** December 24, 2024
**API Version:** v1
